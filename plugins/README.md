# Stremio Management Panel Plugins

This directory contains plugins that extend the functionality of the Stremio Management Panel without modifying the core codebase.

## Available Plugins

1. **Proxy Plugin** - Adds proxy functionality to route Stremio traffic through configurable proxies
2. **PIN Authentication Plugin** - Allows users to register and authenticate using the official Stremio app PIN system

## Plugin Installation

To install a plugin, run the plugin installation script:

```bash
node install-plugin.js --plugin=proxy
# or
node install-plugin.js --plugin=pin-auth
```

## Plugin Development

Plugins follow a standard structure:
- `plugin.json` - Plugin metadata and configuration
- `routes/` - Express routes for the plugin
- `models/` - Mongoose models for the plugin
- `controllers/` - Controllers for the plugin's routes
- `services/` - Business logic for the plugin
- `frontend/` - Frontend components for the plugin (if applicable)