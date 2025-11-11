# E-commerce Inventory Management Flow

## When Does Inventory Decrease?

### Standard E-commerce Flow (3 Common Approaches):

#### 1. **When Order is Placed (Before Payment)** ❌ Not Recommended
- Inventory decreases immediately when customer clicks "Place Order"
- **Problem**: If customer abandons payment, inventory is held unnecessarily
- **Problem**: Multiple customers might order the same last item simultaneously

#### 2. **When Payment is Confirmed (After Payment)** ✅ **This Implementation**
- Inventory decreases when payment gateway confirms payment
- **Advantage**: Only confirmed sales reduce inventory
- **Advantage**: Prevents inventory being held by abandoned carts
- **How it works**: Payment gateway (Stripe) sends a webhook notification

#### 3. **When Order is Shipped** ⚠️ Rare
- Inventory decreases when order is actually shipped
- Usually only for custom/pre-order items
- **Problem**: Can oversell if multiple orders are placed before shipping

---

## Our Implementation Flow

### Step-by-Step Process:

1. **Customer adds items to cart** → No inventory change
2. **Customer clicks "Checkout"** → No inventory change
3. **Stripe Checkout Session created** → No inventory change
4. **Customer completes payment on Stripe** → No inventory change yet
5. **Stripe sends webhook to our server** → **INVENTORY DECREASES HERE** ✅
6. **Order is created in database** → Order status: "processing"
7. **Cart is cleared** → Customer's cart is emptied

### Why Inventory Decreases After Payment?

- **Reliability**: Payment is confirmed before reducing inventory
- **Prevents Overselling**: Only paid orders reduce inventory
- **Prevents Abandoned Cart Issues**: Unpaid carts don't hold inventory
- **Industry Standard**: Most e-commerce sites work this way

---

## Webhook Configuration Required

For inventory to decrease, you MUST configure Stripe webhooks:

### 1. Set up Webhook Endpoint in Stripe Dashboard:
- Go to: https://dashboard.stripe.com/webhooks
- Click "Add endpoint"
- Endpoint URL: `https://your-domain.com/api/checkout/webhook`
- Events to listen for: `checkout.session.completed`
- Copy the "Signing secret" (starts with `whsec_`)

### 2. Add Webhook Secret to Environment:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 3. For Local Development (Testing):
Use Stripe CLI to forward webhooks to local server:
```bash
stripe listen --forward-to localhost:8888/api/checkout/webhook
```

---

## Troubleshooting: Inventory Not Decreasing

### Check These:

1. **Is webhook endpoint configured in Stripe?**
   - Check Stripe Dashboard → Webhooks
   - Verify endpoint URL is correct
   - Check if webhook events are being received

2. **Is STRIPE_WEBHOOK_SECRET set?**
   - Check backend/.env file
   - Must match the signing secret from Stripe Dashboard

3. **Are webhook events being received?**
   - Check server logs for: `Received webhook event: checkout.session.completed`
   - Check for errors: `Webhook signature verification failed`

4. **Is payment status "paid"?**
   - Webhook only processes if `payment_status === "paid"`
   - Check logs for: `Session ... payment status is ..., skipping...`

5. **Check server logs for stock decrease:**
   - Look for: `Stock decreased for order ...`
   - Look for errors: `Error decreasing stock for order ...`

### Debug Steps:

1. Check Stripe Dashboard → Webhooks → Recent events
2. Check if webhook delivery succeeded (green checkmark)
3. Check server logs when webhook is received
4. Verify database connection is working
5. Check if order was created (even if stock didn't decrease)

---

## Testing Webhook Locally

### Option 1: Stripe CLI (Recommended)
```bash
# Install Stripe CLI
# Then run:
stripe listen --forward-to localhost:8888/api/checkout/webhook

# In another terminal, trigger test event:
stripe trigger checkout.session.completed
```

### Option 2: Stripe Dashboard
1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select "checkout.session.completed"
5. Check server logs

---

## Important Notes

- **Inventory decreases ONLY when webhook is received and processed successfully**
- **If webhook fails, Stripe will retry automatically (up to 3 days)**
- **Check server logs to see if webhook is being received**
- **In production, ensure webhook endpoint is publicly accessible (HTTPS)**

