# RAVO HOUSE - GitHub Pages Deployment Guide

Deploy your RAVO HOUSE Product & Order Memo Management Website to **GitHub Pages** for 100% free, high-speed, secure HTTPS hosting.

---

## Step 1: Initialize Git Repository

Open your terminal or PowerShell inside the project directory (`c:\Users\HossainUddinAhamad\Desktop\Ravo`):

```bash
git init
git add .
git commit -m "Initial release of RAVO HOUSE Product & Memo Management System"
```

---

## Step 2: Create a New GitHub Repository

1. Go to [GitHub](https://github.com) and sign in.
2. Click the **+** icon in the top-right corner and select **New repository**.
3. Repository name: `ravo-house` (or any name you prefer).
4. Description: `RAVO HOUSE Product & Order Memo Management Portal`
5. Visibility: **Public** (required for free GitHub Pages).
6. Leave "Initialize this repository with a README" **unchecked** (we already have one).
7. Click **Create repository**.

---

## Step 3: Push Local Code to GitHub

Copy and run the commands provided by GitHub:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ravo-house.git
git push -u origin main
```

*(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username).*

---

## Step 4: Enable GitHub Pages

1. In your GitHub repository, click on the **Settings** tab.
2. In the left navigation menu, scroll down to the **Code and automation** section and click on **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` and folder `/ (root)`.
4. Click **Save**.

---

## Step 5: Access Your Live Website

1. GitHub will take 30 to 60 seconds to build the site.
2. Refresh the **Pages** settings tab.
3. You will see a banner:
   ```text
   Your site is live at https://YOUR_GITHUB_USERNAME.github.io/ravo-house/
   ```
4. Click the link to open your live RAVO HOUSE website!

---

## Step 6: Initial Live Configuration

1. On your live GitHub Pages site, click on **Settings** in the top navigation.
2. Paste your Google Apps Script Web App URL (`https://script.google.com/macros/s/.../exec`).
3. Click **Test Connection** followed by **Save Settings**.
4. Your website is now permanently synchronized with your Google Sheets database in real time!
