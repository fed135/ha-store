# HA-Store Examples

This directory contains practical examples demonstrating how to use **ha-store** in real-world applications.

## Available Examples

### [Express Server](./express-server)

A complete Express.js REST API server showing how to:
- Batch database queries automatically
- Cache frequently accessed data
- Coalesce duplicate requests
- Monitor cache performance with events
- Handle language-specific cache keys

**Best for**: Learning the core features of ha-store in a familiar web framework context.

## Running an Example

Each example has its own README with detailed instructions. Generally:

```bash
# Navigate to the example directory
cd examples/express-server

# Install dependencies
npm install

# Run the example
npm start
```

## Contributing Examples

Have a great use case for ha-store? We'd love to see examples for:

- GraphQL servers (solving N+1 queries)
- Next.js API routes
- NestJS applications
- Microservices with Redis cache tier
- Real-time applications
- Database integration patterns

Please open a pull request!
