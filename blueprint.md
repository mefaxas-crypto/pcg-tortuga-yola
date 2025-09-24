# Application Blueprint: PCG Kitchen Manager

This document provides a detailed technical overview of the PCG Kitchen Manager application's architecture, data flow, state management, database schema, and core component strategies. It is intended for developers who will maintain or extend the application.

## 1. High-Level Architecture

The application is a modern, serverless web app built on a JAMstack-like philosophy, prioritizing performance, scalability, and developer experience.

-   **Framework**: **Next.js 15+ with the App Router**. This provides a hybrid architecture of Server Components (for performance and data fetching) and Client Components (for interactivity).
-   **Frontend**: A reactive and responsive UI built with **React**. Component primitives are provided by **ShadCN UI**, which are then styled with **Tailwind CSS**.
-   **Backend**: Server-side logic is handled exclusively by **Next.js Server Actions** (`/src/lib/actions.ts`). This API-less architecture co-locates backend mutations with frontend calls, simplifying development and ensuring type safety.
-   **Database**: **Google Firestore**, a NoSQL, cloud-native document database, is used for all data persistence. Its real-time capabilities are leveraged for live data updates in the UI.
-   **Authentication**: **Google Firebase Authentication** manages user identity, session management, and provides the security tokens used for database rules.
-   **AI**: **Google Genkit**, an open-source framework, integrates with **Gemini models** for all generative AI features. Flows are defined on the server and called securely from the client.

### 1.1. Request/Response Lifecycle Example (Logging a Sale)

1.  **Client (UI)**: A user in the `SalesForm` component clicks "Log Sale". The form's `onSubmit` handler is triggered.
2.  **Client (Action Call)**: The handler calls the `logSale` Server Action, passing the form data (recipe ID, quantity, etc.). This is an RPC (Remote Procedure Call), not a REST API call.
3.  **Server (Server Action)**: The `logSale` function in `/src/lib/actions.ts` executes on the server.
4.  **Server (Transaction)**: It initiates a **Firestore Transaction** to ensure data integrity.
5.  **Server (DB Reads)**: Within the transaction, it reads the `recipe` document and the current stock levels for each ingredient from the `inventoryStock` collection for the specified outlet.
6.  **Server (DB Writes)**: If there is enough stock, it calculates the new stock levels and, within the same transaction:
    -   Writes a new document to the `sales` collection.
    -   Updates the `quantity` for multiple documents in the `inventoryStock` collection.
7.  **Server (Revalidation)**: Upon successful transaction commit, the action calls `revalidatePath('/inventory')` and `revalidatePath('/sales')`. This purges the Next.js server-side cache for those pages.
8.  **Client (UI Update)**: The browser, upon the next navigation or a background refetch triggered by Next.js, receives fresh data. The inventory table and recent sales list appear updated automatically.

## 2. Frontend Deep Dive (`/src`)

### 2.1. Routing & Internationalization (i18n)

-   **Routing**: The application uses the Next.js App Router. All pages and routes are defined within `/src/app/[locale]`. The `[locale]` dynamic segment is mandatory.
-   **i18n**: Internationalization is handled by `next-intl`.
    -   The `middleware.ts` file manages locale detection (from the URL) and redirection. It ensures every path is prefixed with a supported locale (`en`, `es`, `fr`).
    -   The `i18n.ts` file configures `next-intl`, loading the appropriate translation JSON file from `/src/messages` based on the current locale.
    -   The root layout in `/src/app/[locale]/layout.tsx` wraps the application in `NextIntlClientProvider` to make translations available to Client Components.

### 2.2. Component Architecture

-   **UI Components (`/src/components/ui`)**: These are core, reusable UI elements built using **ShadCN UI**. They are unstyled primitives (buttons, inputs, cards, etc.) that form the building blocks of the interface. They are then styled via `globals.css` and Tailwind CSS.
-   **Layout Components (`/src/components/layout`)**: Components responsible for the overall page structure, including the `Header`, `SidebarNav`, and `OutletSelector`.
-   **Feature Components**: Each feature (e.g., `/src/app/[locale]/inventory/components`) has its own set of components. This co-location makes features modular and easier to manage.
    -   **Client Components (`'use client'`)**: Most feature components are client components. This is **required** for any component that uses React hooks (`useState`, `useEffect`), user interaction (`onClick`), or direct interaction with Firebase's client-side SDK for real-time listeners (`onSnapshot`).
    -   **Server Components**: `PageHeader` and other purely presentational components are Server Components by default to reduce the client-side JavaScript bundle and improve initial page load performance.

### 2.3. State Management

Global UI state is managed via **React Context** to avoid prop-drilling for application-wide concerns.

-   **`AuthProvider` (`/src/context/AuthContext.tsx`)**:
    -   **Purpose**: Manages the currently logged-in Firebase user and their associated application profile (`AppUser`), including their role.
    -   **Implementation**: It wraps the entire application in the root layout. It uses Firebase's `onAuthStateChanged` listener to reactively update the user state. When a user logs in, it also fetches their corresponding profile document from the `users` collection in Firestore.
-   **`OutletProvider` (`/src/context/OutletContext.tsx`)**:
    -   **Purpose**: Manages the globally selected kitchen outlet. This is crucial as most data (inventory, sales, purchasing) is scoped to a specific location.
    -   **Implementation**: It also wraps the application in the root layout. The `OutletSelector` component in the `Header` is responsible for fetching all available outlets and providing the UI for the user to select one. When the user selects an outlet, `setSelectedOutlet` is called, and any component that consumes this context (via the `useOutletContext` hook) re-renders with the new outlet-specific data.

## 3. Backend & Data Integrity (`/src/lib/actions.ts`)

The application avoids traditional REST or GraphQL APIs in favor of **Next.js Server Actions**. This is a deliberate choice for simplicity, type safety, and performance.

-   **Single Entry Point**: The file `/src/lib/actions.ts` contains all backend logic for creating, updating, and deleting data (CRUD operations).
-   **Data Integrity with Transactions**: All critical operations that involve multiple related database writes are wrapped in a **Firestore Transaction** (`runTransaction`). This is the cornerstone of the application's data integrity strategy. A transaction ensures that the entire group of operations either completes successfully or fails entirely, preventing the database from ever being left in a partially updated, inconsistent state.
    -   **`logSale`**: Atomically depletes stock for multiple ingredients *and* creates a sales log entry. If any ingredient is out of stock, the entire operation fails, and no changes are committed.
    -   **`transferInventory`**: Atomically decrements stock at the source outlet and increments it at the destination outlet. It's impossible for stock to be "lost" in transit.
    -   **`logProduction` / `logButchering`**: Atomically depletes raw ingredient stock and increases the stock of the produced/yielded items.
    -   **`receivePurchaseOrder`**: Atomically updates the stock levels for all received items and updates the status of the Purchase Order.
-   **Security**: Because Server Actions run on the server, they are a secure environment to perform sensitive operations. The app's security model will extend this by checking user roles within these actions before executing logic.
-   **Revalidation**: After a successful data mutation, Server Actions use `revalidatePath('/')` to tell Next.js to purge its server-side cache for the specified pages. This ensures that when the user navigates back to a page, they see the fresh, updated data.

## 4. Database Architecture (Firebase Firestore)

Firestore is a NoSQL document database. The structure is a series of collections and documents, designed to be both scalable and efficient for the queries this application needs.

-   **`users`**: Stores application-specific user profiles.
    -   **Path**: `/users/{userId}`
    -   **Purpose**: Augments Firebase Auth users with application-specific data.
    -   **Schema**: `uid`, `email`, `displayName`, `photoURL`, `role` (`'Admin'`, `'Manager'`, etc.).
-   **`outlets`**: A top-level collection of all physical kitchen locations.
    -   **Path**: `/outlets/{outletId}`
    -   **Purpose**: Defines the locations where inventory is managed.
    -   **Schema**: `name`, `address`.
-   **`inventory`**: The master list of all *ingredient specifications*.
    -   **Path**: `/inventory/{inventoryId}`
    -   **Purpose**: This collection defines the "what" of an ingredient (e.g., "Sirloin Steak"), its standard purchase information, cost, and metadata. It **does not** contain quantity information.
    -   **Schema**: `materialCode`, `name`, `category`, `purchaseUnit`, `purchaseQuantity`, `purchasePrice`, `minStock`, `maxStock`, `supplierId`, `unitCost`, `recipeUnit`, `allergens`.
-   **`inventoryStock`**: Stores the actual *quantity on hand*.
    -   **Path**: `/inventoryStock/{stockId}`
    -   **Purpose**: This is the core of inventory management. It links an `inventory` item to an `outlet` and stores the real-time quantity for that specific location. All inventory depletion and addition operations target this collection.
    -   **Schema**: `inventoryId`, `outletId`, `quantity`, `status` (`'In Stock'`, `'Low Stock'`).
-   **`suppliers`**: A list of all vendors.
    -   **Path**: `/suppliers/{supplierId}`
    -   **Schema**: `name`, `contactPerson`, `phoneNumber`, `email`.
-   **`recipes`**: Stores recipe definitions.
    -   **Path**: `/recipes/{recipeId}`
    -   **Purpose**: Defines the ingredients and method for a dish or sub-recipe. It is the source of truth for calculating theoretical cost.
    -   **Schema**: `internalCode`, `name`, `isSubRecipe` (boolean), `category`, `yield`, `yieldUnit`, `ingredients` (array of objects), `totalCost`.
-   **`menus`**: Contains lists of recipes with their set selling prices.
    -   **Path**: `/menus/{menuId}`
    -   **Schema**: `name`, `items` (array of objects containing `recipeId`, `name`, `sellingPrice`, `totalCost`).
-   **`purchaseOrders`**: Logs all purchase orders.
    -   **Path**: `/purchaseOrders/{poId}`
    -   **Schema**: `poNumber`, `outletId`, `supplierId`, `supplierName`, `items` (array), `status`, `createdAt`.
-   **`sales`**: A log of every individual menu item sold.
    -   **Path**: `/sales/{saleId}`
    -   **Purpose**: The source of truth for financial reporting and theoretical inventory depletion.
    -   **Schema**: `outletId`, `menuId`, `recipeId`, `quantity`, `totalRevenue`, `totalCost`, `saleDate`.
-   **`productionLogs` / `butcheringLogs`**: Time-stamped records of production events for auditing and reversal.
    -   **Path**: `/productionLogs/{logId}` or `/butcheringLogs/{logId}`
-   **`inventoryTransfers`**: A log of all stock movements between outlets.
    -   **Path**: `/inventoryTransfers/{transferId}`
-   **`approvals`**: A collection to manage the two-step approval workflow for actions like receiving a PO.
    -   **Path**: `/approvals/{approvalId}`
    -   **Schema**: `type` (`'PO_RECEIPT'`), `status` (`'Pending'`), `createdBy`, `data` (the original action payload).

## 5. Security Rules (`firestore.rules`)

Security is enforced directly at the database level using Firestore Security Rules. This provides a robust defense layer that is independent of the application code.

-   **Default Deny**: The rules start with `allow read, write: if false;`, ensuring that no data is accessible unless explicitly permitted.
-   **Authentication Check**: Almost every rule begins with `allow read, write: if request.auth != null;`, requiring a user to be logged in for any access.
-   **Role-Based Access Control (RBAC)**:
    -   User roles are stored in the `/users/{userId}` document. The rules use `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role` to fetch the requesting user's role.
    -   **Example**: Writing to the `inventory` collection might be restricted: `allow write: if get(...).data.role in ['Admin', 'Manager'];`.
-   **Ownership-Based Rules**: Users can typically only modify their own `user` profile document: `allow write: if request.auth.uid == userId;`.
-   **Data Validation**: The rules can perform basic data validation, such as checking data types (`request.resource.data.quantity is number`) or ranges, providing another layer of defense against malformed data.

## 6. Artificial Intelligence (Genkit)

All AI functionality is managed through **Genkit**, an open-source framework for building production-ready AI applications. This centralizes AI logic and makes it easy to manage and swap models.

-   **Location**: AI flows are defined as server-side modules in `/src/ai/flows/`.
-   **Core Object (`/src/ai/genkit.ts`)**: The global `ai` object is configured here. It initializes the `googleAI` plugin, which provides access to Gemini models, and sets the default model for the application.
-   **Flows (`ai.defineFlow`)**: Each AI feature is an exported async function that calls a Genkit flow.
    -   **Schema Definition**: Flows use **Zod** (`z.object({...})`) to define strict input and output schemas. This is a critical feature: it forces the LLM to return structured JSON data that is type-safe and can be reliably used in the application, rather than unpredictable free-form text.
    -   **Prompt Engineering**: Prompts are defined using `ai.definePrompt`. They contain clear instructions, system personas ("You are a master chef..."), and use Handlebars syntax (`{{{...}}}`) to securely inject dynamic data from the application (like current inventory or sales history) into the prompt text sent to the Gemini API.
    -   **Server-Side Execution**: All flows are marked with `'use server'`. They are called from Client Components, but the entire execution—including the expensive and sensitive call to the Gemini API—happens securely on the server side, protecting API keys and preventing client-side performance bottlenecks.
