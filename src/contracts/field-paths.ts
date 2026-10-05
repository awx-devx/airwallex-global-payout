const SUFFIXES: ReadonlyArray<readonly [string, string]> = [
  ['account_routing_type1', 'routing_type'],
  ['account_routing_value1', 'routing_value'],
  ['address.street_address', 'street'],
  ['address.country_code', 'country'],
  ['address.postcode', 'postcode'],
  ['address.state', 'state'],
  ['address.city', 'city'],
  ['bank_country_code', 'country'],
  ['account_currency', 'currency'],
  ['transfer_currency', 'currency'],
  ['transfer_amount', 'amount'],
  ['account_number', 'account_number'],
  ['account_name', 'contractor_name'],
  ['date_of_birth', 'date_of_birth'],
  ['personal_email', 'email'],
  ['first_name', 'contractor_name'],
  ['last_name', 'contractor_name'],
  ['swift_code', 'swift_bic'],
  ['iban', 'iban'],
]

const ORDERED = [...SUFFIXES].sort((left, right) => right[0].length - left[0].length)

/** Map an Airwallex item error `source` onto a CSV column. Unmapped sources use `row`. */
export function csvPathForAirwallexSource(source: string): string {
  for (const [suffix, path] of ORDERED) {
    if (source === suffix || source.endsWith(`.${suffix}`)) return path
  }
  return 'row'
}
