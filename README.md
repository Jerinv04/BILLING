# Tyre Shop Billing System

A billing/invoicing app for your two-wheeler tyre shop — invoices, products, customers, and a sales dashboard. Data is stored in a shared cloud database (Supabase), so your laptop, phone, and any other PC all see the exact same live data.

---

## Part 1: Set up your free database (Supabase)

1. Go to https://supabase.com and sign up for a free account.
2. Click **New Project**. Give it any name (e.g. "tyre-billing"), set a database password (save it somewhere), and choose the region closest to you. Wait a minute or two for it to finish setting up.
3. In your new project, go to **SQL Editor** (left sidebar) → **New query**.
4. Open the `supabase-setup.sql` file included in this folder, copy all of it, paste it into the SQL editor, and click **Run**. This creates the table the app needs.
5. Go to **Project Settings** (gear icon) → **API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key (under "Project API keys")

## Part 2: Connect the app to your database

1. In this project folder, make a copy of `.env.example` and rename it to `.env`.
2. Open `.env` and paste in your values from Supabase:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Save the file.

## Part 3: Run it locally to test

```
npm install
npm run dev
```

Open the local link it gives you. Go to **Shop Settings**, change the shop name, and check your Supabase dashboard under **Table Editor > app_data** — you should see a row appear. That confirms it's connected.

## Part 4: Get a real URL you can use from any device (Vercel)

1. Create a free account at https://vercel.com (you can sign up with GitHub).
2. Put this project on GitHub:
   - Create a new empty repository on https://github.com/new
   - In this project folder's terminal, run:
     ```
     git init
     git add .
     git commit -m "Tyre billing app"
     git branch -M main
     git remote add origin <your-new-repo-url>
     git push -u origin main
     ```
3. In Vercel, click **Add New > Project**, and import that GitHub repository.
4. Before deploying, open **Environment Variables** in the Vercel project setup screen and add the same two values from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. After a minute, Vercel gives you a live URL like:
   ```
   https://tyre-billing-app.vercel.app
   ```

Open that link on your phone, another PC, anywhere — it will show the exact same shop data, and updates made on one device appear on the others automatically (no refresh needed).

---

## First steps once it's running

1. Go to **Shop Settings** and fill in your real shop name, address, phone, and GSTIN.
2. Go to **Products** and add your actual tyres, tubes, batteries, oils, accessories, and services.
3. Go to **New Invoice** and start billing — customers are added automatically the first time you bill them, or add them ahead of time under **Customers**.

## A note on security

Your Supabase "anon" key is meant to be used in a public-facing app like this one — it's not a secret admin password. But right now, anyone who has your Vercel URL can open the app and see/edit your shop's data, since there's no login screen yet. That's fine for personal or single-shop use, but if you plan to give this URL out more widely (staff, multiple branches), it's worth adding a login step — happy to help with that when you're ready.

## Project structure

```
tyre-billing-app/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example          # copy to .env and fill in your Supabase values
├── supabase-setup.sql    # run once in Supabase's SQL editor
└── src/
    ├── main.jsx           # React entry point
    ├── index.css          # Tailwind imports
    ├── supabaseClient.js  # connects to your Supabase project
    └── App.jsx            # the entire billing system
```
