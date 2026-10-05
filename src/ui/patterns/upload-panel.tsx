import { FILE_ERROR_MESSAGES } from '@/contracts'
import { FileDropzone, type DropzoneState } from '@/ui/primitives/file-dropzone'
import { focusRing } from '@/ui/primitives/button'

export function UploadPanel({
  state = 'idle',
  message = FILE_ERROR_MESSAGES.UNSUPPORTED_FILE,
  interactive = true,
  onFile,
  onSample,
}: {
  state?: 'idle' | 'loading' | 'error'
  message?: string
  interactive?: boolean
  onFile?: (file: File) => void
  onSample?: () => void
}) {
  const dropzoneState: DropzoneState =
    state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'idle'
  const loading = state === 'loading'

  return (
    <div className="grid gap-3">
      <FileDropzone
        state={dropzoneState}
        message={message}
        interactive={interactive && !loading}
        onFile={onFile}
      />
      <button
        type="button"
        className={`${focusRing} w-fit cursor-pointer text-[14px] leading-5 text-[var(--orange-300)] underline disabled:cursor-default disabled:opacity-40`}
        disabled={loading}
        onClick={onSample}
      >
        Use the sample file
      </button>
    </div>
  )
}
