'use client'

import { useState } from 'react'
import { FILE_ERROR_MESSAGES } from '@/contracts'
import { formatMoney } from '@/ui/format/money'
import { Badge } from './badge'
import { Banner } from './banner'
import { Button, type ButtonVariant } from './button'
import { Dialog } from './dialog'
import { EmptyState } from './empty-state'
import { FileDropzone } from './file-dropzone'
import { IconButton } from './icon-button'
import { KeyValue } from './key-value'
import { SkeletonMoney, SkeletonRows, SkeletonText } from './skeleton'
import { Table } from './table'
import { TextInput } from './text-input'
import { Toast, type ToastTone } from './toast'
import { Tooltip } from './tooltip'

const variants: ButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost']
const variantLabel: Record<ButtonVariant, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  danger: 'Danger',
  ghost: 'Ghost',
}

const rows = [
  { id: 'aisha', name: 'Aisha Rahman binte Abdullah', pay: formatMoney('USD', '4200') },
  { id: 'priya', name: 'Priya Nair', pay: formatMoney('JPY', '240000') },
  { id: 'owen', name: 'Owen Clarke', pay: formatMoney('BHD', '1.234') },
  { id: 'zero', name: 'Zero amount', pay: formatMoney('USD', '0') },
]

export function PrimitivesShowcase() {
  const [discardOpen, setDiscardOpen] = useState(false)
  const [toast, setToast] = useState<ToastTone | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  return (
    <div className="grid gap-10">
      <section className="grid gap-3">
        <h3 className="type-label">Button</h3>
        <div className="grid gap-3">
          {variants.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <Button variant={variant} data-testid={variant === 'primary' ? 'kit-primary' : undefined}>
                {variantLabel[variant]}
              </Button>
              <Button variant={variant} force="hover">
                Hover
              </Button>
              <Button variant={variant} force="pressed">
                Pressed
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} loading>
                Loading
              </Button>
            </div>
          ))}
        </div>
        <Button>Pay 6 contractors · {formatMoney('USD', '18960')}</Button>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">IconButton</h3>
        <div className="flex items-center gap-3">
          <IconButton
            label="Copy reference"
            onClick={() => {
              const write = navigator.clipboard?.writeText('B-run_ready')
              if (!write) return
              void write.then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }}
          />
          <IconButton label="Copy reference" disabled />
          <span className="type-id text-[var(--fg-2)]">{copied ? 'Copied' : 'B-run_ready'}</span>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">TextInput</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Email" defaultValue="aisha@example.com" />
          <TextInput label="Email" force="focus" defaultValue="aisha@example.com" />
          <TextInput label="Email" error="Email is invalid." defaultValue="aisha" />
          <TextInput label="Email" disabled defaultValue="sam@example.com" />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">FileDropzone</h3>
        <div className="grid gap-4">
          <FileDropzone interactive={false} />
          <FileDropzone state="drag" interactive={false} />
          <FileDropzone state="loading" interactive={false} />
          <FileDropzone state="error" interactive={false} />
          <FileDropzone
            state={fileName && !fileName.endsWith('.csv') ? 'error' : 'idle'}
            message={FILE_ERROR_MESSAGES.UNSUPPORTED_FILE}
            onFile={(file) => setFileName(file.name)}
          />
          {fileName ? <p className="type-body">{fileName}</p> : null}
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Table</h3>
        <Table
          caption="Contractor amounts"
          hoverId="aisha"
          columns={[
            {
              key: 'name',
              header: 'Contractor',
              cell: (row) => (
                <span className="block max-w-40 truncate" title={row.name}>
                  {row.name}
                </span>
              ),
            },
            { key: 'pay', header: 'You pay', align: 'end', cell: (row) => <span className="nums">{row.pay}</span> },
          ]}
          rows={rows}
        />
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Badge</h3>
        <div className="flex flex-wrap gap-3">
          <Badge tone="up">Paid</Badge>
          <Badge tone="down">Failed</Badge>
          <Badge tone="warn">Needs fix</Badge>
          <Badge tone="info">Ready</Badge>
          <Badge tone="muted">Excluded</Badge>
        </div>
      </section>

      <section className="grid max-w-md gap-3">
        <h3 className="type-label">KeyValue</h3>
        <div>
          <KeyValue label="You pay" value={formatMoney('USD', '18960')} />
          <KeyValue label="Fee" value={formatMoney('USD', '0')} />
          <KeyValue label="Reference" value="B-run_ready" mono />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Dialog</h3>
        <div className="grid gap-4">
          <Dialog
            open
            placement="inline"
            title="Pay 6 contractors · USD 18,960.00 from the USD wallet?"
            confirmLabel="Pay 6 contractors · USD 18,960.00"
            onConfirm={() => undefined}
            onClose={() => undefined}
          />
          <Dialog
            open
            placement="inline"
            tone="danger"
            title="Discard this draft?"
            description="Nothing has been paid."
            confirmLabel="Discard draft"
            onConfirm={() => undefined}
            onClose={() => undefined}
          />
        </div>
        <Button variant="danger" onClick={() => setDiscardOpen(true)}>
          Open discard dialog
        </Button>
        <Dialog
          open={discardOpen}
          tone="danger"
          title="Discard this draft?"
          description="Nothing has been paid."
          confirmLabel="Discard draft"
          onConfirm={() => setDiscardOpen(false)}
          onClose={() => setDiscardOpen(false)}
        />
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Toast</h3>
        <Toast tone="info" message="6 of 6 sent." />
        <Toast tone="down" message="The batch could not be booked." />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setToast('info')}>
            Show info toast
          </Button>
          <Button variant="secondary" onClick={() => setToast('down')}>
            Show failure toast
          </Button>
        </div>
        {toast ? (
          <Toast
            placement="viewport"
            tone={toast}
            message={toast === 'down' ? 'The batch could not be booked.' : '6 of 6 sent.'}
            onClose={() => setToast(null)}
          />
        ) : null}
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Banner</h3>
        <Banner tone="warn">Waiting for approval in Airwallex. This demo cannot approve it.</Banner>
        <Banner tone="down">The batch could not be booked.</Banner>
        <Banner tone="info">6 of 6 sent.</Banner>
      </section>

      <section className="grid gap-3 pb-8">
        <h3 className="type-label">Tooltip</h3>
        <Tooltip label="Aisha Rahman binte Abdullah" open>
          Aisha Rahman binte Abdullah
        </Tooltip>
      </section>

      <section className="grid gap-3">
        <h3 className="type-label">Skeleton</h3>
        <SkeletonText />
        <SkeletonMoney />
        <SkeletonRows />
      </section>

      <section className="grid gap-4">
        <h3 className="type-label">EmptyState</h3>
        <EmptyState title="No payouts yet" action={<Button variant="secondary">Use the sample file</Button>} />
        <EmptyState title="This payout does not exist" action={<Button variant="ghost">Payouts</Button>} />
      </section>
    </div>
  )
}
