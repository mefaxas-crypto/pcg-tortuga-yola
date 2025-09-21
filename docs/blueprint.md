# **App Name**: PCG Kitchen Manager

## Core Features:

- **Inventory Management**: Track all food and beverage items with details like quantity, unit of measure, supplier, and expiration dates.
- **Recipe Costing**: Create detailed recipes, automatically calculate the cost per serving based on real-time ingredient prices, and set menu prices to ensure profitability.
- **Menu Engineering**: Analyze menu item performance based on sales data and food cost to optimize profitability and popularity.
- **Supplier & Purchasing Management**: Maintain a database of suppliers and streamline the purchasing process.
- **Physical Stock Takes & Variance Reporting**: A dedicated module for conducting physical inventory counts and generating variance reports to compare theoretical vs. physical stock, pinpointing sources of waste, spoilage, or loss.
- **Allergen Tracking**: Tag individual ingredients with allergens (e.g., gluten, nuts, dairy). This data will automatically aggregate up to recipes and menu items, allowing for instant and accurate dietary information for guests.
- **Cloud-Native & Serverless Architecture**: The system is a cloud-native application built on modern web technologies.
  - **Database**: Connects to a secure and scalable cloud-based database via Firebase.
  - **Backend**: A serverless backend is implemented using Next.js API Routes, running on Node.js.
  - **Frontend**: A reactive and modern user interface built with Next.js and React, hosted globally on Firebase Hosting.
- **AI-Powered Waste Prediction**: Employs a Genkit-powered AI tool to analyze historical data and predict potential food waste, allowing for proactive adjustments to inventory and purchasing.
- **Intelligent Recipe Suggestions**: Utilizes Genkit to provide AI-driven recipe suggestions based on current inventory, minimizing waste and maximizing resource utilization.

## Style Guidelines:

- Primary Color: Sage Green (`#A3C9A8`) to evoke freshness and a sense of calm control.
- Background Color: A professional dark theme using Off-Black (`#1E1E1E`) for the main background to reduce eye strain in various lighting conditions.
- Accent Color: Muted Gold (`#DAA373`) for primary buttons, active states, and important highlights.
- Headline Font: "Playfair Display", a classic serif font for main titles and dashboards to add a touch of elegance.
- Body & UI Font: "Inter", a clean and highly legible sans-serif font ideal for data tables, forms, and all interactive elements.
- A card-based and table-based hybrid layout. Use cards for dashboard summaries and POS-style views, and dense data tables for inventory and reporting modules. Implement clear iconography for actions like "edit," "delete," and "add."
- Employ subtle and smooth transitions on user interactions to provide a modern, responsive feel without being distracting.
