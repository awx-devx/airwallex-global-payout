/** Byte-for-byte copy of docs/samples/contractors.csv. A test keeps them in sync. */
export const SAMPLE_CONTRACTORS_CSV = `contractor_name,email,date_of_birth,country,currency,amount,street,city,state,postcode,account_number,iban,routing_type,routing_value,swift_bic
Maya Chen,maya.chen@example.com,1991-04-12,US,USD,42.00,412 5th Avenue,Seattle,WA,98104,50001121,,aba,021000021,CHASUS33
Owen Blake,owen.blake@example.com,1988-11-02,GB,GBP,31.00,1 Canada Square,London,,E14 5AB,10006132,GB29NWBK60161331926819,sort_code,040568,NWBKGB2L
Lena Hoffmann,lena.hoffmann@example.com,1990-06-21,DE,EUR,28.00,Unter den Linden 1,Berlin,BE,10117,,DE89370400440532013000,,,COBADEFF
Noah Walsh,noah.walsh@example.com,1987-01-30,AU,AUD,36.00,18 William Street,Melbourne,VIC,3000,716978952,,bsb,082401,NATAAU33
Aisha Rahman,aisha.rahman@example.com,1993-09-14,SG,SGD,41.00,8 Marina Boulevard,Singapore,,018981,0012345671,,,,DBSSSGSG
Priya Nair,priya.nair@example.com,1994-02-08,IN,INR,1850.00,12 MG Road,Bengaluru,KA,560001,123456789012,,bank_code,HDFC0001234,
Sam Rivera,sam.rivera@example.com,1992-03-03,US,USD,9.00,1 Main Street,Austin,TX,,50001129,,aba,021000021,CHASUS33
`

function sampleWith(names: readonly string[]): string {
  const lines = SAMPLE_CONTRACTORS_CSV.trim().split('\n')
  const header = lines[0]
  const picked = names.map((name) => {
    const line = lines.find((row) => row.startsWith(`${name},`))
    if (!line) throw new Error(`Sample row ${name} is missing`)
    return line
  })
  return `${header}\n${picked.join('\n')}\n`
}

/** Five valid corridors. Sandbox advance marks every row paid. */
export const SAMPLE_ALL_PAID_CSV = sampleWith([
  'Maya Chen',
  'Owen Blake',
  'Lena Hoffmann',
  'Noah Walsh',
  'Aisha Rahman',
])

/** The five corridors plus Priya Nair. Sandbox advance marks Priya failed. */
export const SAMPLE_PAID_WITH_FAILURES_CSV = sampleWith([
  'Maya Chen',
  'Owen Blake',
  'Lena Hoffmann',
  'Noah Walsh',
  'Aisha Rahman',
  'Priya Nair',
])

/** Priya Nair only. Sandbox advance marks her failed, so none are paid. */
export const SAMPLE_FAILED_CSV = sampleWith(['Priya Nair'])

export const SAMPLE_FILES = [
  {
    id: 'all-paid',
    label: 'All paid',
    fileName: 'all-paid.csv',
    href: '/samples/all-paid.csv',
    text: SAMPLE_ALL_PAID_CSV,
  },
  {
    id: 'paid-with-failures',
    label: 'Paid with failures',
    fileName: 'paid-with-failures.csv',
    href: '/samples/paid-with-failures.csv',
    text: SAMPLE_PAID_WITH_FAILURES_CSV,
  },
  {
    id: 'failed',
    label: 'Failed',
    fileName: 'failed.csv',
    href: '/samples/failed.csv',
    text: SAMPLE_FAILED_CSV,
  },
  {
    id: 'needs-fix',
    label: 'Needs a fix',
    fileName: 'contractors.csv',
    href: '/samples/contractors.csv',
    text: SAMPLE_CONTRACTORS_CSV,
  },
] as const

export type SampleFileId = (typeof SAMPLE_FILES)[number]['id']
