# Stremio Management Panel User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Management](#user-management)
4. [Addon Management](#addon-management)
5. [Reseller Management](#reseller-management)
6. [Stremio Integration](#stremio-integration)
7. [Troubleshooting](#troubleshooting)

## Introduction

The Stremio Management Panel is a comprehensive solution for managing Stremio users, addons, and resellers. This panel allows administrators to create and manage users, assign addons to users, and manage resellers who can create and manage their own users.

### Key Features

- User management (create, update, delete)
- Addon management (create, import, assign to users)
- Reseller management (create, assign credits, monitor usage)
- Stremio API integration (user sync, addon sync)
- Dashboard with statistics and overview

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Stremio account (for synchronization features)

### Accessing the Panel

1. Open your web browser and navigate to the panel URL provided by your administrator
2. Log in with your credentials
3. If this is your first login, you may be prompted to change your password

### Dashboard Overview

The dashboard provides an overview of your system:

- For administrators: Total users, addons, and resellers
- For resellers: User statistics and credit information
- For users: Addon information and Stremio sync status

## User Management

### Creating a New User

1. Navigate to "Users" in the sidebar
2. Click the "Add User" button
3. Fill in the required information:
   - Username
   - Email
   - Password
   - Role (Admin, Reseller, or User)
   - Expiration date (optional)
4. Click "Save User"

### Managing Users

1. Navigate to "Users" in the sidebar
2. Use the search box to find specific users
3. Click on a user to view or edit their details
4. From the user details page, you can:
   - Update user information
   - Activate/deactivate the user
   - Set an expiration date
   - Assign addons
   - Sync with Stremio

### Syncing Users with Stremio

For a user to access their assigned addons in Stremio, they need to be synced:

1. Navigate to the user's details page
2. If the user is not synced, they can:
   - Sync with an existing Stremio account (requires Stremio credentials)
   - Register a new Stremio account

## Addon Management

### Adding a New Addon

1. Navigate to "Addons" in the sidebar
2. Click the "Add Addon" button
3. Fill in the required information:
   - Name
   - Description
   - Transport URL (the URL to the addon manifest)
   - Addon ID
4. Click "Validate" to verify the addon
5. Select resources and types
6. Choose whether the addon should be public
7. Click "Save Addon"

### Importing Official Addons

1. Navigate to "Addons" in the sidebar
2. Click the "Official Addons" tab
3. Find the addon you want to import
4. Click the import button
5. The addon will be added to your collection

### Assigning Addons to Users

1. Navigate to the user's details page
2. In the "Assigned Addons" section, select an addon from the dropdown
3. Click "Add"
4. The addon will be assigned to the user
5. If the user is synced with Stremio, click "Sync Addons" to update their Stremio account

## Reseller Management

### Creating a New Reseller

1. Navigate to "Resellers" in the sidebar
2. Click the "Add Reseller" button
3. Fill in the required information:
   - Username
   - Email
   - Password
   - Credits
4. Click "Save Reseller"

### Managing Credits

1. Navigate to "Resellers" in the sidebar
2. Find the reseller you want to manage
3. Click the credit card icon to add credits
4. Enter the number of credits to add
5. Click "Add Credits"

### Reseller Operations

As a reseller, you can:

1. Create and manage users (each user creation consumes 1 credit)
2. Assign addons to your users
3. View statistics about your users
4. Sync your users with Stremio

## Stremio Integration

### How Stremio Integration Works

The panel integrates with the official Stremio API to:

1. Create or authenticate Stremio users
2. Assign addons to Stremio users
3. Sync addon changes with Stremio

### Addon Synchronization

When an addon is assigned to a user:

1. The addon is added to the user's collection in the panel
2. If the user is synced with Stremio, the addon is also added to their Stremio account
3. The user can immediately access the addon in their Stremio application

### Important Notes About Stremio Integration

- Addons must have valid manifest URLs
- Stremio validates addons against its repository
- Custom addons must follow the Stremio addon protocol
- Stremio may replace custom addons with official ones if they have the same transportUrl

## Troubleshooting

### Common Issues

#### User Cannot See Assigned Addons in Stremio

1. Verify the user is synced with Stremio
2. Check if the addon is valid and active
3. Try manually syncing the addons from the user details page
4. Ensure the addon has a valid manifest URL

#### Addon Validation Fails

1. Check if the manifest URL is correct and accessible
2. Verify the manifest follows the Stremio addon protocol
3. Try accessing the manifest URL directly in your browser
4. Check if the addon server is online and responding

#### Reseller Cannot Create Users

1. Check if the reseller has sufficient credits
2. Verify the reseller account is active
3. Ensure the reseller has the correct permissions

### Getting Support

If you encounter issues not covered in this guide, please contact your system administrator or support team with the following information:

1. Detailed description of the issue
2. Steps to reproduce the problem
3. Error messages (if any)
4. Screenshots (if applicable)