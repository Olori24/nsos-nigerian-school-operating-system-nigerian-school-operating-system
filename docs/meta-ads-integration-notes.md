# Meta Advertising Integration Notes

NSOS will treat Meta as a connected external advertising provider, not as a repository for school advertising credentials. Meta’s Marketing API supports campaign-management operations across its advertising technologies, while ad-account webhooks can notify a connected application of certain advertising changes. [1][2]

Before NSOS can receive ad-account webhook events, Meta requires a configured webhook endpoint, application subscription under the relevant ad account, edit access to that ad account, and the `ads_management` permission. [2] NSOS should therefore keep provider access tenant-scoped, encrypt connection credentials, verify webhook signatures, record campaign actions in the security audit trail, and keep external spend approval explicit.

Meta’s current ad-creation guidance confirms that creating a campaign requires a `POST` to the ad account’s campaigns endpoint with at least a campaign name, objective, and an initial status. Meta recommends `PAUSED` for the initial campaign state while setup continues. [3] An ad set is then required for bidding, targeting, and daily budget configuration; its documented requirements include a name, campaign ID, daily budget in minor units, and targeting. [4] NSOS must not expose a real launch control until it can gather and validate the remaining creative and placement requirements as well as the school’s explicit approval of the spend.

Meta’s creative flow additionally requires an ad-creative name and an `object_story_spec`; the documented link-ad example includes the school’s Facebook Page ID, message, destination URL, image or video URL, and call to action. [5] The final ad requires an ad-set ID, creative ID, and status; `ACTIVE` launches the ad while `PAUSED` keeps it inactive. [6] Therefore, NSOS’s present approval step is deliberately non-spending: a complete direct-launch module must first collect a school page ID and verified media, construct the campaign/ad-set/creative/ad chain as paused assets, present a final spend confirmation, and only then set the final ad to active.

NSOS now follows that sequence for the Meta-first workspace. It validates a tenant-owned Meta account, creates a paused campaign, then creates a paused ad set, creative, and ad when the administrator supplies a numeric Facebook Page ID, a public HTTPS creative-image URL, and a destination URL. The final `ACTIVE` request is isolated behind a separate confirmation dialog that states the campaign’s approved NGN daily and total budget. A corresponding pause action and an external-status sync endpoint keep the displayed state reconciled with Meta without exposing access tokens or provider identifiers outside the tenant-scoped service layer.

## References

[1]: https://developers.facebook.com/documentation/ads-commerce/marketing-api "Meta Marketing API documentation"
[2]: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts/ "Meta ad-account webhooks documentation"
[3]: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/basic-ad-creation/create-an-ad-campaign "Meta create an ad campaign documentation"
[4]: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/basic-ad-creation/create-an-ad-set "Meta create an ad set documentation"
[5]: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/basic-ad-creation/create-an-ad-creative "Meta create an ad creative documentation"
[6]: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/basic-ad-creation/create-an-ad "Meta create an ad documentation"
