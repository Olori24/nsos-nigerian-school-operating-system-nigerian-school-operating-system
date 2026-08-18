# Provider Delivery Research Notes

- **Termii Messaging API:** A single SMS is submitted with `POST https://BASE_URL/api/sms/send` and an API key, international-format destination, sender ID, message, type, and channel. A successful submission response returns a message identifier; it is not itself evidence of handset delivery.
- **Termii Insights:** The official Insights documentation states that the provider supports real-time delivery reports and provides an Events and Reports webhook mechanism. NSOS should regard a test SMS as submitted until a delivery report/event has been received.
- **Twilio:** Twilio’s messaging documentation identifies outbound message status tracking through message status callbacks. NSOS should retain a submitted message identifier and distinguish queued/submitted status from provider-confirmed delivery.

Sources reviewed: [Termii Messaging API](https://developers.termii.com/messaging-api), [Termii Insights](https://developers.termii.com/insights), and [Twilio outbound message status tracking](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status).

## Real-Time SMS Delivery Webhooks

| Provider | Callback mechanics | Authentication | Terminal-success mapping | Terminal-failure mapping |
| --- | --- | --- | --- | --- |
| Termii | JSON `POST` delivery report with `message_id` and `status`, registered in the Termii developer console. | `X-Termii-Signature`: HMAC-SHA512 of the raw JSON payload using the tenant webhook secret. | `Delivered` | `DND Active on Phone Number`, `Message Failed`, `Rejected`, `Expired` |
| Twilio | Form-encoded `POST` status callback, supplied as `StatusCallback` on message creation, with `MessageSid` and `MessageStatus`. | `X-Twilio-Signature`: HMAC-SHA1 over the fully qualified callback URL plus submitted form fields, using the tenant Auth Token. | `delivered` | `failed`, `undelivered` |

Termii’s `Message Sent` report remains pending; all other unrecognised statuses remain non-terminal. Twilio callbacks can arrive out of order, so NSOS must not downgrade an already terminal record. Both public callback endpoints must be stateless, complete signature verification before any tenant data mutation, and acknowledge valid notifications quickly with HTTP 200. The administrator-controlled delivery check remains available as a troubleshooting fallback.
