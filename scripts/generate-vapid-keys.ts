import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.info(
  "# Add these to your .env.local and Vercel Environment Variables:"
);
console.info(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.info(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.info("VAPID_SUBJECT=mailto:tutor@example.com");
