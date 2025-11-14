# Email Service Options for Aksara SSO

> **Decision Guide**: Should you use free SMTP relay or paid email service?

## Quick Recommendation

| Your Situation | Recommendation |
|---------------|----------------|
| **Development/Testing** | Gmail SMTP (Free) |
| **Small team (<100 users)** | Gmail SMTP or M365 SMTP (Free) |
| **Medium team (100-500 users)** | Resend Free Tier → Paid |
| **Large org (500+ users)** | Resend/SendGrid/AWS SES (Paid) |
| **Already using M365** | Microsoft 365 SMTP (Free/Included) |
| **Need high deliverability** | Paid service (better reputation) |
| **Cost-conscious startup** | Start with Gmail, migrate later |

---

## Option A: Free SMTP Relay Services

### 1. Gmail SMTP Relay

**✅ Pros:**
- **100% Free** - No cost, even for commercial use
- **Easy Setup** - 5 minutes to configure
- **Reliable** - Google infrastructure
- **Good for development** - Perfect for testing
- **Familiar** - Most developers have Gmail account

**❌ Cons:**
- **Daily limit: 500 emails** - Hard cap, resets midnight PT
- **Per-email limit: 100 recipients** - Can't mass email
- **Requires App Password** - 2FA must be enabled
- **Sender restrictions** - Must send from Gmail address or verified domain
- **Less reliable for production** - Can be flagged as spam
- **No delivery analytics** - Basic bounce handling only
- **Rate limiting** - Can be throttled if sending too fast
- **Gmail branding** - "via gmail.com" in some email clients

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true  # Use TLS
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # NOT your Gmail password!
```

**Setup Steps:**
1. Enable 2-step verification on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this 16-character password in SMTP_PASS

**Daily Limits:**
- 500 emails per day per account
- 100 recipients per email
- Limit resets at midnight Pacific Time
- If exceeded: SMTP error 550 5.4.5 (quota exceeded)

**Best For:**
- Development and testing
- Small internal tools (<500 users)
- Proof of concept / MVP
- Personal projects
- Teams with <50 active users

**Not Suitable For:**
- Production SSO with >100 users
- Marketing emails
- Time-sensitive notifications at scale
- Applications requiring delivery analytics

---

### 2. Microsoft 365 SMTP Relay

**✅ Pros:**
- **Free if you have M365** - Included in Business plans
- **Higher limits** - 10,000 emails/day (varies by plan)
- **Better for business** - Professional sender reputation
- **No "via" labels** - Cleaner email headers
- **Enterprise support** - If on paid M365 plan
- **Better deliverability** - Microsoft infrastructure

**❌ Cons:**
- **Requires M365 subscription** - Not free if you don't have it
- **More complex setup** - Requires app password or OAuth
- **Authentication required** - Must use valid M365 account
- **Per-user limits** - 30 messages/minute per mailbox
- **Domain verification needed** - For custom sender domains
- **Plan-dependent features** - Limits vary by subscription tier

**Configuration:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=true  # Use STARTTLS
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-app-password  # Or regular password if MFA disabled
```

**Setup Steps:**
1. Use existing Microsoft 365 business email
2. If MFA enabled, create app password
3. Verify domain ownership (for custom From address)
4. Configure SMTP settings

**Limits (Business Plans):**
- 10,000 recipients per day
- 30 messages per minute per mailbox
- 500 recipients per message
- Higher limits on Enterprise plans

**Best For:**
- Organizations already using Microsoft 365
- Medium-sized teams (100-1000 users)
- Production deployments
- Business applications requiring reliability

**Not Suitable For:**
- If you don't have M365 (not worth buying just for SMTP)
- High-volume transactional emails (>10k/day)
- Marketing campaigns

---

## Option B: Transactional Email Services (Paid)

### 1. Resend (Recommended for Developers)

**✅ Pros:**
- **Generous free tier** - 3,000 emails/month, 100/day free
- **Best developer experience** - Simple, modern API
- **Fast setup** - Literally 5 minutes from signup to sending
- **Great documentation** - Clear, concise examples
- **Email testing** - Built-in email preview/testing
- **Analytics** - Open rates, click tracking, bounces
- **High deliverability** - Optimized infrastructure
- **React Email support** - Create emails with React components
- **Affordable scaling** - $20/month for 50,000 emails

**❌ Cons:**
- **Costs money** - $20/month after free tier
- **Newer service** - Less proven than SendGrid/SES
- **Limited integrations** - Fewer than competitors

**Pricing:**
- **Free**: 3,000 emails/month (100/day)
- **Pro**: $20/month for 50,000 emails
- **Scale**: Custom pricing for >50k

**Configuration:**
```typescript
// Using Resend SDK (recommended)
import { Resend } from 'resend';
const resend = new Resend('re_...');

await resend.emails.send({
  from: 'SSO <noreply@yourdomain.com>',
  to: user.email,
  subject: 'Your Verification Code',
  html: '<p>Your code is: <strong>123456</strong></p>'
});
```

**Best For:**
- Modern development teams
- Startups scaling beyond free tier
- Applications needing analytics
- Teams wanting great DX

---

### 2. SendGrid (Industry Standard)

**✅ Pros:**
- **Truly free tier** - 100 emails/day **forever**
- **Battle-tested** - Used by millions of apps
- **Excellent deliverability** - Best-in-class reputation
- **Rich features** - Templates, analytics, A/B testing
- **Scalable** - Handles millions of emails
- **Twilio acquisition** - Strong backing

**❌ Cons:**
- **Complex setup** - More configuration required
- **Free tier limits** - Only 100/day (but permanent)
- **Overwhelming UI** - Too many features for simple use
- **Aggressive upselling** - Constant upgrade prompts
- **API complexity** - Steeper learning curve

**Pricing:**
- **Free**: 100 emails/day forever
- **Essentials**: $20/month for 50,000 emails
- **Pro**: $90/month for 100,000 emails

**Best For:**
- Applications needing 100% uptime
- Enterprise deployments
- Marketing + transactional emails
- Teams with complex email workflows

---

### 3. AWS SES (Simple Email Service)

**✅ Pros:**
- **Cheapest at scale** - $0.10 per 1,000 emails
- **No monthly minimums** - Pay only for what you use
- **Unlimited volume** - No hard caps
- **AWS integration** - If already using AWS
- **High deliverability** - Amazon infrastructure

**❌ Cons:**
- **Requires AWS account** - More setup complexity
- **Sandbox mode** - Need approval to send to public
- **No free tier** - Pay from first email (though very cheap)
- **More technical** - Need to understand AWS IAM, SES, etc.
- **Limited analytics** - Need additional AWS services

**Pricing:**
- **First 62,000 emails/month**: FREE (if sending from EC2)
- **After that**: $0.10 per 1,000 emails
- **Example**: 10,000 emails/month = $1/month

**Best For:**
- High-volume applications (>100k emails/month)
- AWS-native applications
- Cost-conscious at scale
- Teams comfortable with AWS

---

## Comparison Table

| Feature | Gmail SMTP | M365 SMTP | Resend | SendGrid | AWS SES |
|---------|-----------|-----------|---------|----------|---------|
| **Free Tier** | 500/day | 10k/day* | 3k/month | 100/day | $1/10k |
| **Setup Time** | 5 min | 10 min | 5 min | 15 min | 30 min |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Deliverability** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Analytics** | ❌ | ❌ | ✅ | ✅ | ⚠️ |
| **Cost at 10k/mo** | Free | Free* | Free | $20 | $1 |
| **Cost at 50k/mo** | N/A | Free* | $20 | $20 | $5 |
| **Reliability** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

*Requires Microsoft 365 subscription

---

## Migration Path: Start Free, Scale Later

### Stage 1: Development (0-10 users)
**Use: Gmail SMTP (Free)**
- Perfect for development
- No cost, easy setup
- Good enough for testing

### Stage 2: Beta/Pilot (10-100 users)
**Use: Gmail SMTP or Resend Free**
- Still within limits
- Consider Resend for better deliverability
- Monitor email volume

### Stage 3: Production (100-500 users)
**Use: Resend Pro or M365 SMTP**
- Gmail SMTP approaching limits
- Need reliable delivery
- Analytics become important
- $20/month is acceptable

### Stage 4: Scale (500+ users)
**Use: SendGrid/AWS SES**
- High volume needs
- Enterprise reliability
- Cost optimization matters
- Advanced features needed

---

## Common Pitfalls & Solutions

### Problem: Gmail "App Password" not working
**Solution:**
- Ensure 2FA is enabled on Google account
- Generate NEW app password (old ones expire)
- Use 16-character password WITH spaces (Gmail format)
- Check "Less secure app access" is OFF (you should use app passwords)

### Problem: Emails going to spam
**Solution:**
- **SPF Record**: Add to DNS: `v=spf1 include:_spf.google.com ~all`
- **DKIM**: Enable in Gmail settings (if using G Suite)
- **Verify domain**: Use paid service to verify your domain
- **Warm up**: Send gradually, don't blast 500 emails immediately
- **Content**: Avoid spam trigger words, use plain text + HTML

### Problem: Hit daily limit on Gmail
**Solutions:**
1. **Use multiple Gmail accounts** - Rotate between accounts
2. **Upgrade to Workspace** - Higher limits (~2000/day)
3. **Switch to paid service** - Resend/SendGrid/SES
4. **Batch emails** - Spread sends across 24 hours

### Problem: M365 authentication failing
**Solution:**
- Use app-specific password if MFA enabled
- Or use OAuth2 (more complex but better)
- Verify email address matches M365 account
- Check SMTP AUTH is enabled in Exchange admin

---

## Recommendation for Aksara SSO

### For Initial Launch:
**Use Gmail SMTP if:**
- <100 users expected
- Budget-constrained
- Development/testing phase
- Can tolerate occasional spam issues

**Use M365 SMTP if:**
- Already have Microsoft 365
- 100-500 users expected
- Need better deliverability
- Want production-ready solution

### For Production (>100 users):
**Use Resend if:**
- Modern tech stack
- Want great DX
- Need analytics
- Budget allows $20/month

**Use SendGrid if:**
- Enterprise requirements
- Need advanced features
- Want battle-tested solution
- Okay with 100/day free tier

**Use AWS SES if:**
- Already on AWS
- High volume (>50k/month)
- Cost optimization critical
- Team comfortable with AWS

---

## Quick Setup Guide: Gmail SMTP

```typescript
// 1. Install nodemailer
// bun add nodemailer @types/nodemailer

// 2. Create email service
// src/lib/email/email-service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!, // App password
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || '',
      html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}

// 3. Test it
await sendEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  html: '<p>Hello from Aksara SSO!</p>',
});
```

```env
# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM_NAME=Aksara SSO
```

---

## Final Verdict

**Start with Gmail SMTP for development, plan to migrate to Resend for production.**

**Rationale:**
- Zero upfront cost to get started
- Easy setup, quick wins
- Learn email patterns with free tier
- Migrate to Resend when you hit limits
- $20/month is worth the reliability gain

**Don't over-engineer early, but plan the migration path!**
