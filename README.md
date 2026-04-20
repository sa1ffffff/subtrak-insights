# SubTrak X

SubTrak X is a financial intelligence application that helps users manage subscriptions, analyze spending, and optimize recurring expenses.

It is designed as a database-first system where PostgreSQL (via Supabase) performs all core computations, including billing logic, analytics, predictions, and recommendations. The frontend serves only as a visualization and interaction layer.

## Tech Stack

- React (TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL, Auth)

## Features

- User authentication and financial profile management
- Subscription tracking (price, billing cycle, category, status)
- Automated billing calculations using SQL
- Payment tracking with status handling
- Monthly and category-wise spending analytics
- Subscription health scoring
- Spending prediction based on historical data
- Waste detection for unused or costly subscriptions
- Budget monitoring and overspending alerts
- Trigger-based alert system for renewals and risks

## Database

- 12–15 normalized tables
- Use of primary keys, foreign keys, and constraints
- Stored functions for financial computations
- Triggers for automation
- Views for analytics and reporting

## Purpose

To demonstrate advanced database design and SQL capabilities by building a real-world financial analytics system that goes beyond basic CRUD operations.
