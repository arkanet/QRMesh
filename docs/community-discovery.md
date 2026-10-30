# QRMesh Public Discovery — automatic, no admin backend

## Where it searches
The initial crawl starts from the official Meshtastic local-group directory, publicly available MeshCore channel pages, and public Bing RSS search results. No account, API token, login or private group access is required. Search RSS availability is best-effort: providers may throttle or change endpoints; a failed provider is reported rather than bypassed.

## SEO-like queries and relevance
Search queries: `meshtastic community channels qr`, `meshtastic local mesh group channel PSK`, `meshcore community channels key`, `meshcore network join channels`.
The scoring vocabulary is in `data/discovery-config.json`, split into protocol, community and channel terms. Terms such as `mesh`, `network`, `community`, `regional`, `canali`, `channel`, `psk`, `qr code`, `join`, and `channelset` help rank links. No community-specific keyword (including SOS-Italia) is required.

The crawler follows ranked links up to 5 levels, bounded by a global 80-page budget and per-domain limits. Search snippets are discovery hints only and **never** qualify as independent verification.

## Automatic verification and publication
The pipeline collects publicly displayed Meshtastic channel import links and supported public MeshCore channel text, validates extracted keys, and deduplicates evidence by canonical domain. **Community-first rule:** a valid channel found on the canonical official domain of a referenced community is automatically approved, provided that no conflicting key is found. The community is the trust anchor, not each individual channel. For isolated channels or those lacking a verified official community source, approval requires three independently hosted matching observations, at least 75% agreement, no conflicting keys, and an attested community association. External links from a community site remain supporting evidence, not automatically official. Generic default channels are not automatically approved merely because they appear on the open web; an official referenced community may legitimately publish such a channel. Evidence from an unauthenticated search result alone cannot attest a community's identity.

Only approved candidates can be written by `scripts/discovery/nightly.js` to `data/catalog.json`; reports redact unapproved PSKs. Updates are committed by the nightly workflow when running on the default branch, or through a manual dispatch where supported. GitHub scheduled workflows do **not** execute on a non-default development branch, so automatic overnight runs will remain dormant until the tested workflow is merged.

If the safety threshold is never met, **zero channels are approved**: this is correct, not a failed search. There is no admin panel and no manual review queue. The audit report is a CI artifact. The user-facing SINGOLO/MULTI selectors list only communities with approved catalog channels. Existing catalog entries are preserved.

## Tests
`node --test scripts/discovery/*.test.js` and the branch CI's `live-audit` run automatic checks. No private Telegram/Facebook/Discord content or authenticated APIs are accessed. MeshCore structured community directories are potential future seed sources where their schema can be validated.
