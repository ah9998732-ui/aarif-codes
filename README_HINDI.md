# Manoj Sweets & Cold Drink Madarpur — 2 connected websites

Is ZIP mein do alag static websites aur customer site ke Netlify Functions/backend hain:
- `public/` = customer shop website (products, cart, COD/online payment, receipt, order tracking)
- `owner-site/` = alag private owner website (new orders, Confirm Order, delivery ETA/dispatch, payment status, print receipt)
- `netlify/functions/` = shared secure server API + Firebase Admin + Razorpay + optional WhatsApp Cloud API

## Android mobile se setup
1. ZIP ko Android Files app se extract karein. GitHub account banayein; GitHub mobile website/app se files repository mein upload karein.
2. Firebase Console (`https://console.firebase.google.com`) par project banayein, Firestore enable karein, aur project settings se Web App config copy karke `public/app.js` ke `firebaseConfig` values mein paste karein. Browser Firebase config public hota hai; private service-account key kabhi public files mein na rakhein.
3. Firebase Project Settings → Service Accounts se service-account JSON banayein. Pura JSON Netlify customer-site environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` mein ek line mein paste karein. Firestore rules ko Firebase Console mein `firestore.rules` ke mutabik publish karein. Backend Admin SDK server-side access use karta hai.
4. Customer site Netlify par deploy karein: repo import karein; build publish directory `public`, functions directory `netlify/functions` (included `netlify.toml`). `public/app.js` mein `RAZORPAY_KEY_ID` ko apni Razorpay test key se replace karein.
5. Customer Netlify site ke Environment variables mein `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_PIN` (kam se kam 16+ random characters), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, aur `OWNER_ORIGIN` baad mein set karein. `ADMIN_PIN` sirf temporary gate hai; isko strong rakhein, share na karein, aur launch se pehle proper Firebase Auth / server-side role + rate limiting lagwayein.
6. Owner website ko alag Netlify site ke roop mein deploy karein. Is site ka publish directory `owner-site` rakhein. `owner-site/app.js` ki pehli line mein `API_BASE` ko customer Netlify URL se replace karein (e.g. `https://shop-name.netlify.app`). Phir customer site ke `OWNER_ORIGIN` env var mein owner site ka exact URL set karein aur customer site redeploy karein. Owner website par noindex/nofollow enabled hai, lekin noindex privacy/security ka substitute nahi hai.
7. Razorpay: pehle test keys use karein. Netlify customer environment variables mein `RAZORPAY_KEY_ID` aur `RAZORPAY_KEY_SECRET` set karein; `public/app.js` mein public Key ID same rakhein. Online payment ko live karne se pehle Razorpay account/KYC, webhook signature verification, test transactions, refund handling aur reconciliation configure karein. COD alag se kaam karta hai.

## WhatsApp notifications (required setup)
WhatsApp notification ke liye Meta WhatsApp Cloud API account, verified business/number, customer consent/opt-in, aur approved message template zaroori hain. Meta Developer dashboard mein template banayein jisme BODY mein **3 text placeholders** hon, order ID, status, ETA ke liye. Phir customer Netlify environment variables set karein: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN` (server-side secret), `WA_TEMPLATE_NAME`, `WA_TEMPLATE_LANGUAGE` (default `en_US`). Customer number India ka 10-digit number hai, function `91` prefix add karta hai. WhatsApp template ka language/template name exactly approved template se match hona chahiye. WhatsApp send fail hone par order database mein phir bhi save/update hota hai; logs Netlify Functions mein dekhein.

## Customer updates and tracking
Customer Order ID + same mobile number se tracking karta hai. Tracking page khula ho to status around 20 seconds mein auto-refresh hota hai; page band ho to next visit par latest status milega. WhatsApp message separate notification hai. Delivery boy ka live GPS tracking included nahi hai; owner dispatch time aur ETA manually update karta hai.

## Business/product details
Shop ek independent multi-brand wholesale shop hai; PepsiCo ya kisi drink company ki official/affiliated site nahi. Prices are per peti/wholesale unit as provided; launch se pehle case quantity, rates, delivery area and every product image verify karein. Product images are still generic placeholders and should be added before launch.

## Before going live checklist
- Test one COD order and every status transition.
- Test Razorpay in test mode; never put secret keys in browser code/GitHub.
- Send WhatsApp only after explicit customer opt-in; use approved template.
- Replace temporary PIN with robust authentication, rate limiting, logging and role-based access.
- Configure Razorpay webhooks and backups.
- Check privacy notice/consent, refund/cancellation rules, delivery coverage and GST/tax requirements.
