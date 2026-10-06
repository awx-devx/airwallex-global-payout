# Sandbox verification

Recorded 2026-10-06T23:16:26.878Z. Environment `sandbox`, base URL `https://api.sandbox.airwallex.com`, API version `2026-08-21`, source currency `USD`.

Redacted responses are in `src/server/adapters/airwallex/__fixtures__/`. Account numbers, IBANs, routing values, and credentials are replaced with `[Redacted]`.

| ID | Result | Detail |
| --- | --- | --- |
| V1 | pass | login returned a bearer token |
| V2 | pass | USD available 9840619.98 |
| V3 | pass | ff092da9-42e6-40b2-afc2-15f2ac591e29 DRAFTING |
| V4 | pass | deleted i:5d2aa967-ed2b-4e01-bc61-b545b90938ce:1:S; before total_item_count=2, valid_item_count=2; DRAFTING total_item_count=1, valid_item_count=1 |
| V5 | pass | validity HR_1; expires_at 2026-10-07T00:16:14+0000; quotes 1 |
| V6 | pass | 10.00 USD → BOOKING |
| V7 | pass | transfer_id on BOOKED; keys id, request_id, status, transfer_id, updated_at; transfer SCHEDULED |
| V8 | pass | 6:L VALIDATED pays 1933.66 clearing empty | 5:L VALIDATED pays 3234.67 clearing FAST | 4:L VALIDATED pays 2532.84 clearing BANK_TRANSFER | 3:L VALIDATED pays 3169.51 clearing empty | 2:L VALIDATED pays 4137.44 clearing FASTER_PAYMENTS | 1:L VALIDATED pays 4200.0 clearing ACH |
| V9 | pass | 6:S VALIDATION_FAILED pays none clearing empty (transfer, transfer) |
| Q-06 | pass | 2:S VALIDATED pays none clearing empty |
| V10 | pass | SENT → SENT; PAID → PAID |
| V11 | pass | second create rejected batch_request_id_duplicate: The request ID has been used to a batch before which was created successfully. Please use a different request ID if you wish to create a separate batch transfer. |
| V12 | skip | webhook secret is set; no tunnel was started, so live delivery was not checked |

## Beneficiary schema

`POST /api/v1/beneficiary_api_schemas/generate` with `entity_type=PERSONAL` and no `local_clearing_system`.

| Corridor | Detail |
| --- | --- |
| US-USD-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=required, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| GB-GBP-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=absent, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| DE-EUR-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=absent, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| AU-AUD-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=required, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| SG-SGD-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=absent, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| IN-INR-LOCAL | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=required, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| GB-GBP-SWIFT | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=absent, beneficiary.address.postcode=required, beneficiary.address.country_code=required |
| IN-INR-SWIFT | clearing absent; beneficiary.date_of_birth=optional, beneficiary.address.street_address=required, beneficiary.address.city=required, beneficiary.address.state=required, beneficiary.address.postcode=required, beneficiary.address.country_code=required |

## Transfer id

transfer_id on BOOKED; keys id, request_id, status, transfer_id, updated_at
