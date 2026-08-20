import {
  Button,
  Dialog,
} from '@nevo/ui';

import ReactDiffViewer from 'react-diff-viewer-continued';

interface ApprovalTask {
  name: string;
  result?: {
    diff?: Record<
      string,
      unknown
    >;
  };
}

interface ApprovalModalProps {
  isOpen: boolean;
  task: ApprovalTask | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({
  isOpen,
  task,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  const diff =
    task?.result?.diff;

  if (
    !task ||
    !diff
  ) {
    return null;
  }

  const oldText =
    Object.entries(diff)
      .map(
        ([file, content]) =>
          `--- ${file}\n${String(content)}`,
      )
      .join('\n');

  const newText =
    Object.entries(diff)
      .map(
        ([file, content]) =>
          `+++ ${file}\n${String(content)}`,
      )
      .join('\n');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onReject();
        }
      }}
      title={`Approve Changes for ${task.name}`}
    >
      <div className="max-h-[80vh] overflow-auto">
        <div className="max-h-64 overflow-auto rounded border border-[#334155] p-2">
          <ReactDiffViewer
            oldValue={oldText}
            newValue={newText}
            splitView
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="danger"
            onClick={onReject}
          >
            Reject
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onApprove}
          >
            Approve &amp; Apply
          </Button>
        </div>
      </div>
    </Dialog>
  );
}