# Provider Delivery Research Notes

- **Termii Messaging API:** A single SMS is submitted with `POST https://BASE_URL/api/sms/send` and an API key, international-format destination, sender ID, message, type, and channel. A successful submission response returns a message identifier; it is not itself evidence of handset delivery.
- **Termii Insights:** The official Insights documentation states that the provider supports real-time delivery reports and provides an Events and Reports webhook mechanism. NSOS should regard a test SMS as submitted until a delivery report/event has been received.
- **Twilio:** Twilio’s messaging documentation identifies outbound message status tracking through message status callbacks. NSOS should retain a submitted message identifier and distinguish queued/submitted status from provider-confirmed delivery.

Sources reviewed: [Termii Messaging API](https://developers.termii.com/messaging-api), [Termii Insights](https://developers.termii.com/insights), and [Twilio outbound message status tracking](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status).
