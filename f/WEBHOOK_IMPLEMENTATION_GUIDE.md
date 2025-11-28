# Stripe Webhook Implementation Guide

## Overview
This guide explains how to implement the backend webhook handler for Stripe payment confirmation and order creation.

## Frontend Changes (Already Implemented)

### 1. API Service (`api.ts`)
- Added `getOrderBySessionId(sessionId)` method
- Polls backend to check if order was created by webhook

### 2. CheckoutSuccess Component
- **Primary Flow**: Polls for order creation (webhook-based)
- **Fallback Flow**: Uses `verifyPaymentAndCreateOrder` if webhook doesn't work within timeout
- Implements exponential backoff polling (up to 20 attempts, ~30 seconds total)

## Backend Implementation Required

### 1. Webhook Endpoint

Create a webhook endpoint at: `/api/webhooks/stripe`

**Required Features:**
- Verify Stripe webhook signature
- Handle `checkout.session.completed` event
- Create order when payment is confirmed
- Store session_id with order for lookup

### 2. Webhook Event Handling

```javascript
// Pseudo-code example
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Create order
    await createOrderFromSession(session);
  }

  res.json({ received: true });
});
```

### 3. Order Creation from Session

When `checkout.session.completed` is received:

1. **Extract session data:**
   - `session.id` - Stripe session ID
   - `session.customer_email` - Customer email
   - `session.amount_total` - Total amount paid
   - `session.metadata.shipping_address_id` - Shipping address ID (should be set when creating checkout session)

2. **Create order:**
   - Get cart items from session metadata or database
   - Create order with status `pending`
   - Store `session.id` in order record for lookup
   - Clear user's cart
   - Send confirmation email

3. **Store session_id mapping:**
   - Store `session.id` → `order.id` mapping
   - This allows frontend to lookup order by session_id

### 4. New API Endpoint Required

**GET `/api/checkout/order-by-session?session_id={session_id}`**

This endpoint should:
- Lookup order by Stripe session_id
- Return order_id and order_number if found
- Return error if not found (frontend will continue polling)

**Response Format:**
```json
{
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-12345"
  }
}
```

### 5. Update Checkout Session Creation

When creating checkout session (`/api/checkout/create-session`), ensure:
- `metadata.shipping_address_id` is included
- `metadata.user_id` is included (if available)
- `success_url` includes `?session_id={CHECKOUT_SESSION_ID}`

### 6. Security Considerations

1. **Webhook Signature Verification:**
   - Always verify Stripe webhook signature
   - Use `STRIPE_WEBHOOK_SECRET` from environment variables
   - Reject requests with invalid signatures

2. **Idempotency:**
   - Check if order already exists for session_id
   - Prevent duplicate order creation
   - Use database unique constraint on session_id

3. **Error Handling:**
   - Log all webhook events
   - Handle failures gracefully
   - Implement retry logic for failed webhook processing

### 7. Database Schema Updates

Add to orders table:
- `stripe_session_id` (VARCHAR, UNIQUE, INDEXED)
- This allows fast lookup by session_id

### 8. Testing

**Local Testing with Stripe CLI:**
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8888/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

**Production:**
- Configure webhook endpoint in Stripe Dashboard
- Set webhook URL: `https://yourdomain.com/api/webhooks/stripe`
- Select events: `checkout.session.completed`
- Copy webhook signing secret to environment variable

## Flow Diagram

```
1. User completes payment on Stripe
   ↓
2. Stripe sends webhook event: checkout.session.completed
   ↓
3. Backend webhook handler receives event
   ↓
4. Backend verifies signature & creates order
   ↓
5. Frontend polls: GET /checkout/order-by-session?session_id=xxx
   ↓
6. Backend returns order_id and order_number
   ↓
7. Frontend displays success page with order details
```

## Fallback Flow

If webhook doesn't create order within ~30 seconds:
- Frontend falls back to `verifyPaymentAndCreateOrder`
- This ensures order is created even if webhook fails
- Provides redundancy for reliability

## Benefits of Webhook-Based Flow

1. **Reliability**: Works even if user closes browser
2. **Security**: Payment confirmation from Stripe, not client
3. **Real-time**: Order created immediately when payment succeeds
4. **Scalability**: Handles high traffic better
5. **Idempotency**: Prevents duplicate orders

## Implementation Checklist

- [ ] Create webhook endpoint `/api/webhooks/stripe`
- [ ] Implement signature verification
- [ ] Handle `checkout.session.completed` event
- [ ] Create order from session data
- [ ] Store session_id in order record
- [ ] Create GET `/api/checkout/order-by-session` endpoint
- [ ] Add `stripe_session_id` column to orders table
- [ ] Update checkout session creation to include metadata
- [ ] Test with Stripe CLI locally
- [ ] Configure webhook in Stripe Dashboard for production
- [ ] Add error logging and monitoring

