import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { mission, lesson, conceptCard, questionArchetype } from "../lib/db/schema";

config({ path: ".env.local" });

const BIOLOGY_DIR = "/Users/dhrubo.paul/Sites/teachingchatbot/docs/biology";
const CHEMISTRY_DIR = "/Users/dhrubo.paul/Sites/teachingchatbot/docs/chemistry";
const MATHS_DIR = "/Users/dhrubo.paul/Sites/teachingchatbot/docs/maths";

const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const mapDifficulty = (diff: number | undefined): "must" | "should" | "could" | "gcse_bridge" => {
  if (diff === 1) return "must";
  if (diff === 2) return "should";
  if (diff === 3) return "could";
  if (diff === 4) return "gcse_bridge";
  return "should";
};

function getConceptCards(topic: string): { title: string; body: string; example?: string }[] {
  const normalised = topic.toLowerCase().trim();
  
  if (normalised.includes("cell")) {
    return [
      {
        title: "The Building Blocks of Life",
        body: "All living organisms are made up of tiny units called cells. They are the basic structures that perform all the functions necessary for life, from releasing energy to reproducing.",
        example: "An amoeba is made of a single cell, while a human body is made of trillions of cells working together."
      },
      {
        title: "Two Main Types of Cells",
        body: "Cells are divided into eukaryotic (complex cells with a nucleus, like animal and plant cells) and prokaryotic (simple cells without a nucleus, like bacteria).",
        example: "Your skin cells have a nucleus containing DNA, whereas bacteria have their DNA floating freely."
      },
      {
        title: "Inside Animal and Plant Cells",
        body: "Animal and plant cells share organelles like the nucleus (controls cell), cytoplasm (where reactions happen), cell membrane (controls entry/exit), and mitochondria (respiration). Plant cells also have a cell wall, a vacuole, and chloroplasts.",
        example: "Chloroplasts contain chlorophyll, which makes plant leaves look green and absorbs sunlight for photosynthesis."
      }
    ];
  }

  if (normalised.includes("reproduction")) {
    return [
      {
        title: "The Cells of Reproduction",
        body: "In sexual reproduction, specialised sex cells called gametes are needed. The male gamete is sperm, produced in the testes, and the female gamete is the egg cell (ovum), produced in the ovaries.",
        example: "Sperm cells have a tail to swim towards the egg, while egg cells are larger and packed with nutrients."
      },
      {
        title: "Fertilisation",
        body: "Fertilisation is the fusion of the nucleus of a male gamete (sperm) with the nucleus of a female gamete (egg) to form a zygote. This combines genetic information from both parents.",
        example: "Fertilisation usually happens in the oviduct (fallopian tube) after ovulation occurs."
      },
      {
        title: "Gestation and Birth",
        body: "After fertilisation, the zygote divides to form an embryo. It implants in the uterus wall, where it receives oxygen and nutrients via the placenta and umbilical cord. Over nine months, it develops into a fetus.",
        example: "Amniotic fluid surrounds the developing fetus to protect it from physical shocks."
      }
    ];
  }

  if (normalised.includes("organisation") || normalised.includes("organization")) {
    return [
      {
        title: "How Living Things Are Structured",
        body: "Multicellular organisms are organised in a hierarchy: Cells -> Tissues (groups of similar cells) -> Organs (groups of tissues working together) -> Organ Systems (organs working together) -> Organism.",
        example: "Muscle cells form muscle tissue, which makes up the stomach (organ), which is part of the digestive system."
      },
      {
        title: "Teamwork in the Body",
        body: "Different organ systems carry out distinct life processes. The digestive system breaks down food, the circulatory system transports substances, and the respiratory system manages gas exchange.",
        example: "The heart pumps oxygenated blood to all organs through arteries, which is part of the circulatory system."
      },
      {
        title: "Plant Organisation",
        body: "Plants also have tissues and organs. Plant organs include leaves (for photosynthesis), stems (for support/transport), and roots (to absorb water and anchor the plant).",
        example: "Xylem tissue transports water and minerals up from the roots, while phloem tissue transports sugars around the plant."
      }
    ];
  }

  if (normalised.includes("reaction")) {
    return [
      {
        title: "What is a Chemical Reaction?",
        body: "A chemical reaction is a process where substances (reactants) change into new substances (products) with different properties. Chemical bonds are broken and new bonds are formed.",
        example: "Burning wood or rusting iron are chemical reactions, whereas melting ice is a physical change."
      },
      {
        title: "Signs of a Chemical Reaction",
        body: "You can spot a chemical reaction by looking for signs: a change in temperature (gets hotter or colder), a change in colour, a gas being produced (bubbling/fizzing), or a solid forming (precipitate).",
        example: "Adding vinegar to baking soda produces carbon dioxide gas, causing rapid bubbling."
      },
      {
        title: "Chemical Equations",
        body: "We represent chemical reactions using equations. Word equations show the names of reactants and products, while symbol equations show the chemical formulas and must be balanced.",
        example: "Hydrogen + Oxygen -> Water (2H2 + O2 -> 2H2O)"
      }
    ];
  }

  if (normalised.includes("particle")) {
    return [
      {
        title: "States of Matter",
        body: "Everything around us is made of particles. Matter exists in three main states: solid (fixed shape and volume), liquid (fixed volume, takes shape of container), and gas (no fixed shape or volume).",
        example: "Ice, liquid water, and water vapour are the solid, liquid, and gas states of water."
      },
      {
        title: "Particle Behaviour",
        body: "Particles in a solid are tightly packed and vibrate in fixed positions. Particles in a liquid are close together but can move past each other. Particles in a gas are far apart and move rapidly in all directions.",
        example: "Gas particles exert pressure when they collide with the walls of their container."
      },
      {
        title: "Changes of State",
        body: "When particles gain or lose energy (usually as heat), matter changes state. Heating a solid makes it melt into a liquid; heating a liquid makes it boil/evaporate into a gas. Cooling reverses these processes.",
        example: "Condensation is when water vapour in the air cools down and turns back into liquid droplets on a cold surface."
      }
    ];
  }

  if (normalised.includes("element") || normalised.includes("compound")) {
    return [
      {
        title: "Elements: Nature's Building Blocks",
        body: "An element is a pure substance made from only one type of atom. Elements cannot be broken down into simpler substances. All known elements are organised in the Periodic Table.",
        example: "Oxygen (O), Iron (Fe), and Gold (Au) are elements."
      },
      {
        title: "Compounds: Bound Together",
        body: "A compound is a substance formed when two or more different elements are chemically bonded together in fixed proportions. Compounds have completely different properties from the elements that make them.",
        example: "Water (H2O) is a compound made of hydrogen gas and oxygen gas. Sodium chloride (salt, NaCl) is made of reactive sodium metal and toxic chlorine gas."
      },
      {
        title: "Mixtures: Together but Separate",
        body: "A mixture contains different substances (elements or compounds) that are mixed together but not chemically bonded. They can be separated easily using physical methods.",
        example: "Air is a mixture of nitrogen, oxygen, carbon dioxide, and other gases. Sand and water is a mixture that can be separated by filtration."
      }
    ];
  }

  return [
    {
      title: `Introduction to ${topic}`,
      body: `This card introduces the fundamental principles of ${topic}, explaining why it is an essential part of the science curriculum and how it relates to other scientific concepts.`,
      example: `Understanding ${topic} helps us explain real-world processes and phenomena.`
    },
    {
      title: `Core Concepts in ${topic}`,
      body: `Here we dive deeper into the key mechanisms, theories, or structures that define ${topic}. Pay close attention to definitions and processes.`,
      example: `Focus on how different components of ${topic} interact with one another.`
    },
    {
      title: `Practical Applications of ${topic}`,
      body: `Science is all around us! This card explores how our understanding of ${topic} is applied in technology, medicine, research, or everyday life.`,
      example: `Applying the laws of ${topic} allows scientists to conduct experiments and solve practical problems.`
    }
  ];
}

interface QuestionItem {
  id?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: number;
  question: string;
  answer: string;
  hint?: string;
  explanation?: string;
  misconception?: string;
}

async function main() {
  console.log("Starting subject artifact import...");

  // Safely create maths directory if not exists
  if (!existsSync(MATHS_DIR)) {
    console.log(`Creating missing maths directory: ${MATHS_DIR}`);
    await mkdir(MATHS_DIR, { recursive: true });
  }

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("POSTGRES_URL environment variable is not defined!");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const directories = [
    { path: BIOLOGY_DIR, subject: "science", domain: "biology" },
    { path: CHEMISTRY_DIR, subject: "science", domain: "chemistry" },
    { path: MATHS_DIR, subject: "maths", domain: "maths" },
  ];

  let missionCount = 0;
  let lessonCount = 0;
  let cardsCount = 0;
  let archetypeCount = 0;

  let overallMissionOrder = 100; // start higher to avoid collisions with maths defaults

  for (const dir of directories) {
    if (!existsSync(dir.path)) {
      console.log(`Skipping non-existent directory: ${dir.path}`);
      continue;
    }

    const files = (await readdir(dir.path)).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.log(`No JSON files found in: ${dir.path}`);
      continue;
    }

    console.log(`Processing directory: ${dir.path} (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(dir.path, file);
      const fileName = path.basename(file, ".json");
      const rawData = await readFile(filePath, "utf-8");
      const questions = JSON.parse(rawData) as QuestionItem[];

      console.log(`  File ${file}: parsing ${questions.length} questions...`);

      // Group questions by topic to create missions
      const questionsByTopic = new Map<string, QuestionItem[]>();
      for (const q of questions) {
        const topic = q.topic || fileName;
        if (!questionsByTopic.has(topic)) {
          questionsByTopic.set(topic, []);
        }
        questionsByTopic.get(topic)!.push(q);
      }

      for (const [topic, topicQuestions] of questionsByTopic) {
        const missionSlug = slugify(topic);
        console.log(`    Mission [${topic}] (slug: ${missionSlug})`);

        // Upsert Mission
        const [insertedMission] = await db
          .insert(mission)
          .values({
            slug: missionSlug,
            title: topic,
            description: `Learn about ${topic} in Year 9 ${dir.subject}.`,
            yearGroup: 9,
            subject: dir.subject,
            gcseDomain: dir.domain,
            order: overallMissionOrder++,
            estimatedMinutes: 45,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: mission.slug,
            set: {
              title: topic,
              description: `Learn about ${topic} in Year 9 ${dir.subject}.`,
              subject: dir.subject,
              gcseDomain: dir.domain,
            },
          })
          .returning();

        missionCount++;

        // Group questions within this mission by subtopic to create lessons
        const questionsBySubtopic = new Map<string, QuestionItem[]>();
        for (const q of topicQuestions) {
          const subtopic = q.subtopic || topic;
          if (!questionsBySubtopic.has(subtopic)) {
            questionsBySubtopic.set(subtopic, []);
          }
          questionsBySubtopic.get(subtopic)!.push(q);
        }

        let lessonOrder = 1;
        for (const [subtopic, subtopicQuestions] of questionsBySubtopic) {
          const lessonSlug = `${missionSlug}-${slugify(subtopic)}`;
          console.log(`      Lesson [${subtopic}] (slug: ${lessonSlug})`);

          // Upsert Lesson
          const [insertedLesson] = await db
            .insert(lesson)
            .values({
              missionId: insertedMission.id,
              slug: lessonSlug,
              title: subtopic,
              summary: `Master the key concepts of ${subtopic}.`,
              order: lessonOrder++ * 10,
              difficultyBand: "core",
              estimatedMinutes: 15,
            })
            .onConflictDoUpdate({
              target: lesson.slug,
              set: {
                missionId: insertedMission.id,
                title: subtopic,
                summary: `Master the key concepts of ${subtopic}.`,
              },
            })
            .returning();

          lessonCount++;

          // Idempotently delete existing concept cards for this lesson and seed new ones
          await db.delete(conceptCard).where(eq(conceptCard.lessonId, insertedLesson.id));
          const cards = getConceptCards(topic);
          for (let i = 0; i < cards.length; i++) {
            await db.insert(conceptCard).values({
              lessonId: insertedLesson.id,
              order: i + 1,
              title: cards[i].title,
              body: cards[i].body,
              example: cards[i].example || null,
              visual: null,
              misconception: null,
            });
            cardsCount++;
          }

          // Insert/Upsert QuestionArchetypes
          for (const item of subtopicQuestions) {
            const skillSlug = `${dir.subject}_${missionSlug}_${slugify(subtopic)}`;
            const archSlug = item.id || `${lessonSlug}-${slugify(item.question).slice(0, 30)}`;

            const archRow = {
              slug: archSlug,
              subject: dir.subject,
              yearGroup: 9,
              missionSlug: missionSlug,
              lessonSlug: lessonSlug,
              skillSlug: skillSlug,
              gcseDomain: dir.domain,
              difficultyBand: mapDifficulty(item.difficulty),
              questionType: "short_text" as const,
              template: item.question,
              variableSchemaJson: {},
              answerExpression: `\`${item.answer.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\``,
              acceptableAnswerRulesJson: { caseInsensitive: true },
              hintTemplate: item.hint || `Here is a clue for ${subtopic}: Try to recall the main definition from the card.`,
              explanationTemplate: item.explanation || `The correct answer is: ${item.answer}.`,
              misconceptionTagsJson: item.misconception ? [item.misconception] : [],
              sourceStyle: "imported science artifact",
              calculatorAllowed: false,
              isActive: true,
              updatedAt: new Date(),
            };

            await db
              .insert(questionArchetype)
              .values(archRow)
              .onConflictDoUpdate({
                target: questionArchetype.slug,
                set: {
                  missionSlug: archRow.missionSlug,
                  lessonSlug: archRow.lessonSlug,
                  skillSlug: archRow.skillSlug,
                  gcseDomain: archRow.gcseDomain,
                  difficultyBand: archRow.difficultyBand,
                  template: archRow.template,
                  answerExpression: archRow.answerExpression,
                  hintTemplate: archRow.hintTemplate,
                  explanationTemplate: archRow.explanationTemplate,
                  misconceptionTagsJson: archRow.misconceptionTagsJson,
                  isActive: archRow.isActive,
                  updatedAt: new Date(),
                },
              });

            archetypeCount++;
          }
        }
      }
    }
  }

  await client.end();
  console.log("\nImport Complete!");
  console.log(`Missions upserted: ${missionCount}`);
  console.log(`Lessons upserted: ${lessonCount}`);
  console.log(`Concept Cards seeded: ${cardsCount}`);
  console.log(`Question Archetypes upserted: ${archetypeCount}`);
}

main().catch((err) => {
  console.error("Import script failed:", err);
  process.exit(1);
});
