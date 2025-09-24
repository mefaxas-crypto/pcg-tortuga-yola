# PCG Kitchen Manager

PCG Kitchen Manager is a comprehensive, enterprise-ready application designed to streamline and optimize all aspects of professional kitchen operations. From multi-outlet inventory management to AI-powered purchasing and dynamic menu engineering, this tool provides the control and insight needed to maximize profitability and efficiency.

Built on a modern, serverless architecture, it offers a robust, scalable, and responsive experience for chefs, managers, and purchasing agents.

## Core Features

- **Multi-Outlet Inventory Management**: Track ingredient stock levels across multiple locations in real-time. Includes dedicated modules for physical stock takes, variance reporting, and inter-outlet transfers.
- **Recipe & Menu Engineering**: Create detailed recipes with automatic cost calculation. Assemble recipes into menus and analyze profitability based on real-time ingredient costs and sales data.
- **End-to-End Purchasing Workflow**: Manage suppliers, generate purchase orders based on low-stock alerts, receive goods, and automatically update inventory and item costs.
- **Production & Butchering Logs**: Record the production of sub-recipes and the yield from butchering primary cuts, ensuring accurate inventory depletion and costing.
- **Sales Logging & Depletion**: Log menu item sales to automatically deplete corresponding ingredient quantities from inventory.
- **Advanced Reporting**: A full suite of reports including Sales & Profitability analysis, Actual vs. Theoretical Food Cost, and historical variance trends.
- **User Roles & Permissions**: A complete authentication system with roles (Admin, Manager, Supervisor, Chef) to control access to different features and implement approval workflows.
- **AI-Powered Intelligence**:
    - **Demand Forecasting**: Predicts future ingredient needs based on sales history and external factors like hotel occupancy forecasts.
    - **Dynamic Stock Levels**: Suggests optimized Min/Max stock levels to reduce waste and prevent stockouts.
    - **Intelligent Recipe Suggestions**: Recommends recipes based on current inventory to minimize waste.

## Tech Stack

- **Framework**: Next.js 15 (with App Router)
- **Language**: TypeScript
- **UI**: React, ShadCN UI, Tailwind CSS
- **Database & Auth**: Google Firebase (Firestore & Firebase Authentication)
- **Generative AI**: Google Genkit (with Gemini models)
- **Styling**: Tailwind CSS with CSS Variables for theming.
- **Internationalization**: `next-intl` for multi-language support.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm or yarn

### Running the Development Server

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Set up Firebase**:
    - Ensure you have a Firebase project created.
    - The Firebase configuration is located in `src/lib/firebase.ts`. This project is pre-configured, but you can swap it with your own project details if needed.
    - The Firestore security rules are located in `firestore.rules` and are deployed automatically.

3.  **Run the App**:
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:9002`.
