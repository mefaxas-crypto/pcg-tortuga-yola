# Application Blueprint: PCG Kitchen Manager

This document provides a technical overview of the PCG Kitchen Manager application's architecture, data flow, and core components.

## 1. High-Level Architecture

The application is a modern, serverless web app built on the following principles:

-   **Frontend**: A reactive and responsive UI built with Next.js and React.
-   **Backend**: Server-side logic handled by Next.js Server Actions, providing a seamless, API-less architecture for data mutations.
-   **Database**: Google Firestore, a NoSQL, cloud-native database, for all data persistence.
-   **Authentication**: Google Firebase Authentication for user management and security.
-   **AI**: Google Genkit, an open-source framework, integrates with Gemini models for all generative AI features.

## 2. Frontend Deep Dive (`/src`)

### 2.1. Routing & Internationalization (i18n)

-   **Routing**: The application uses the Next.js App Router. All pages and routes are defined within the `/src/app` directory.
-   **i18n**: Internationalization is handled by `next-intl`.
    -   The `[locale]` dynamic segment in the routing structure (`/src/app/[locale]`) captures the current language (en, es, fr).
    -   The `middleware.ts` file manages locale detection and redirection.
    -   Translation strings are stored in JSON files within `/src/messages`.

### 2.2. Component Architecture

-   **UI Components (`/src/components/ui`)**: These are core, reusable UI elements built using **ShadCN UI**. They are unstyled primitives (buttons, inputs, cards, etc.) that form the building blocks of the interface.
-   **Layout Components (`/src/components/layout`)**: Components responsible for the overall page structure, including the `Header`, `SidebarNav`, and `OutletSelector`.
-   **Feature Components**: Each feature (e.g., `/src/app/[locale]/inventory/components`) has its own set of components. This co-location makes features modular and easier to manage.
    -   **Client Components (`'use client'`)**: Most feature components are client components because they involve user interaction, state management (`useState`, `useEffect`), and direct interaction with Firebase through the browser SDK.
    -   **Server Components**: `PageHeader` and other purely presentational components are often Server Components to reduce the client-side JavaScript bundle.

### 2.3. State Management

-   **React Context**: Global UI state is managed via React Context to avoid prop-drilling.
    -   **`AuthContext`**: Manages the currently logged-in user and their associated application profile (`AppUser`), including their role. It wraps the entire application in the root layout.
    -   **`OutletContext`**: Manages the globally selected kitchen outlet. The `OutletSelector` in the `Header` updates this context, and all pages that display outlet-specific data (Dashboard, Inventory, Purchasing) consume it.

## 3. Backend Deep Dive (`/src/lib/actions.ts`)

The application avoids traditional REST or GraphQL APIs in favor of **Next.js Server Actions**.

-   **Single Point of Entry**: The file `/src/lib/actions.ts` contains all backend logic for creating, updating, and deleting data.
-   **Data Integrity with Transactions**: All critical operations that involve multiple database writes are wrapped in a **Firestore Transaction** (`runTransaction`). This ensures that the operation either completes entirely or fails without leaving the database in an inconsistent state.
    -   `logSale`: Atomically depletes stock for multiple ingredients and creates a sales log.
    -   `transferInventory`: Atomically decrements stock at the source outlet and increments it at the destination outlet.
    -   `logProduction`: Atomically depletes raw ingredient stock and increases the stock of the produced sub-recipe.
-   **Security**: Because Server Actions run on the server, they are a secure place to perform sensitive operations. In this app, user roles (from `AuthContext`) are checked within these actions to enforce permissions (e.g., only a 'Manager' can approve a PO).
-   **Revalidation**: After a successful data mutation, actions use `revalidatePath('/')` to tell Next.js to purge its cache and re-fetch fresh data for the specified pages, ensuring the UI updates automatically.

## 4. Database Architecture (Firebase Firestore)

Firestore is a NoSQL document database. The structure is a series of collections and documents.

-   **`users`**: Stores application-specific user profiles, including their assigned role.
-   **`outlets`**: A list of all kitchen locations.
-   **`inventory`**: The master list of all *ingredient specifications*. This collection defines the "what" (e.g., "Sirloin Steak, 200g"), its purchase price, supplier, etc. It does not contain quantity information.
-   **`inventoryStock`**: Stores the actual *quantity on hand* for each inventory item at each outlet. This collection links `inventory` and `outlets` and is the source of truth for stock levels.
-   **`suppliers`**: A list of all vendors.
-   **`recipes`**: Stores recipe definitions, including their ingredients (with quantities and units) and calculated costs. Sub-recipes are also stored here and flagged with `isSubRecipe: true`.
-   **`menus`**: Contains lists of recipes with their set selling prices.
-   **`purchaseOrders`**: Logs all POs, their status (Pending, Received, etc.), and the items ordered.
-   **`sales`**: A log of every individual menu item sold, used for financial reporting and inventory depletion.
-   **`productionLogs` / `butcheringLogs`**: Time-stamped records of production events for auditing and reversal.
-   **`inventoryTransfers`**: A log of all stock movements between outlets.
-   **`approvals`**: A collection to manage the two-step approval workflow for actions like receiving a PO.

### Security Rules (`firestore.rules`)

Security is enforced at the database level. The `firestore.rules` file defines who can read, write, update, or delete documents in each collection. The rules heavily leverage the `request.auth.uid` and custom claims (like user roles) to enforce permissions. For example, a rule might state that only a user with the 'Purchasing Manager' role can create a document in the `purchaseOrders` collection.

## 5. Artificial Intelligence (Genkit)

All AI functionality is managed through **Genkit**, an open-source framework for building production-ready AI applications.

-   **Location**: AI flows are defined in `/src/ai/flows/`.
-   **Core Object (`/src/ai/genkit.ts`)**: The global `ai` object is configured here, setting up the Google AI plugin and defining the default model (e.g., Gemini 2.5 Flash).
-   **Flows**: Each AI feature is an exported async function that calls a Genkit flow (`ai.defineFlow`).
    -   **Schema Definition**: Flows use `zod` to define strict input and output schemas. This forces the LLM to return structured JSON data, which can be reliably used in the application, rather than unpredictable free-form text.
    -   **Prompt Engineering**: Prompts are defined using `ai.definePrompt`. They contain clear instructions, system personas ("You are a master chef..."), and use Handlebars syntax (`{{{...}}}`) to inject dynamic data like current inventory or sales history.
    -   **Server-Side Execution**: All flows are marked with `'use server'` and are called from client components, but the execution (including the call to the Gemini API) happens securely on the server.
