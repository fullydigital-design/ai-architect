# Need Files - Integration Reference

## ✅ CORRECT FILE LIST (Based on Your Prototype)

Please paste your code into these files in this order:

### 🔥 PRIORITY 1 - MUST HAVE (Start Here):
1. **services/geminiService.ts** - All Gemini API calls (MOST IMPORTANT!)
2. **contexts/AppContext.tsx** - Global state management
3. **prototype-App.tsx** - Your main App.tsx structure
4. **types.ts** - TypeScript type definitions
5. **NOTES.md** - Answer the questions there

### 📦 PRIORITY 2 - CORE COMPONENTS:
6. **components/ImageUploader.tsx** - Image upload component
7. **components/ImageEditor.tsx** - Image editing component
8. **components/ImageDisplay.tsx** - Display generated images
9. **components/GenerationGallery.tsx** - Gallery of generations
10. **components/MaskEditor.tsx** - Mask editing for inpainting
11. **components/ReferenceImageUploader.tsx** - Reference image upload

### 🛠️ PRIORITY 3 - UTILITIES & HELPERS:
12. **utils/fileUtils.ts** - File handling utilities
13. **components/Header.tsx** - Header component
14. **components/Icons.tsx** - Icon components
15. **components/Spinner.tsx** - Loading spinner

### 📋 PRIORITY 4 - CONFIGURATION:
16. **package.json** - Dependencies list
17. **env-example.txt** - Environment variables (NO REAL KEYS!)

---

## 📁 Complete File Structure:

```
/Need_files/
├── README.md (this file)
├── NOTES.md (please fill out!)
├── env-example.txt
├── package.json
├── types.ts
├── prototype-App.tsx
│
├── components/
│   ├── GenerationGallery.tsx
│   ├── Header.tsx
│   ├── Icons.tsx
│   ├── ImageDisplay.tsx
│   ├── ImageEditor.tsx
│   ├── ImageUploader.tsx
│   ├── MaskEditor.tsx
│   ├── ReferenceImageUploader.tsx
│   └── Spinner.tsx
│
├── contexts/
│   └── AppContext.tsx
│
├── services/
│   └── geminiService.ts (🔥 MOST IMPORTANT)
│
└── utils/
    └── fileUtils.ts
```

---

## 🎯 What I Need to Understand:

From these files, I need to understand:
1. **How Gemini API is called** (geminiService.ts)
2. **What state is tracked** (AppContext.tsx)
3. **How images are processed** (ImageEditor.tsx, fileUtils.ts)
4. **How the UI flows** (App.tsx)
5. **What models/APIs you use** (package.json, geminiService.ts)

Once you paste the code, I'll analyze it and create an integration plan! 🚀
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1oV-WVLSe2iVI2FH1lewHBLv31NpBVc_K

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
