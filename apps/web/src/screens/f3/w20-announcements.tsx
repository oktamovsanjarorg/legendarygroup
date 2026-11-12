import { formatDateTime, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  Card,
  type ColumnDef,
  DataTable,
  Drawer,
  Field,
  PageHeader,
  SelectField,
} from '@lg/ui-web';
import { Eye, Paperclip, Plus, Send } from 'lucide-react';
import { useState } from 'react';
import type { AnnouncementAudience, AnnouncementItem } from './types.js';

interface Props {
  announcements: readonly AnnouncementItem[];
  onSendAnnouncement?: (item: {
    title: string;
    content: string;
    target: AnnouncementAudience;
  }) => void;
}

const AUDIENCES: readonly AnnouncementAudience[] = ['all', 'groups', 'debtors', 'teachers'];
const isAudience = (v: string): v is AnnouncementAudience =>
  (AUDIENCES as readonly string[]).includes(v);

const columns: ColumnDef<AnnouncementItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: t.announcements.cols.title,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.title}</span>
        <span className="line-clamp-1 text-xs text-text-muted">{row.original.content}</span>
      </div>
    ),
  },
  {
    accessorKey: 'target',
    header: t.announcements.cols.target,
    cell: ({ row }) => (
      <Badge tone="info">
        {row.original.groupName ?? t.announcements.audiences[row.original.target]}
      </Badge>
    ),
  },
  {
    accessorKey: 'date',
    header: t.announcements.cols.date,
    cell: ({ row }) => formatDateTime(row.original.date),
  },
  { accessorKey: 'author', header: t.announcements.cols.author },
  {
    accessorKey: 'sentCount',
    header: t.announcements.cols.sentCount,
  },
  {
    id: 'deliveryRate',
    header: t.announcements.cols.deliveryRate,
    cell: ({ row }) => {
      const sent = row.original.sentCount;
      const rate = sent > 0 ? Math.round((row.original.deliveredCount / sent) * 100) : 0;
      return (
        <span className="flex items-center justify-end gap-1 font-medium text-success">
          {rate}%
        </span>
      );
    },
  },
];

function AnnouncementPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-alt/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Eye className="size-3.5" aria-hidden />
        {t.announcements.form.previewTelegram}
      </div>
      <div className="rounded-lg bg-surface p-3 shadow-sm border border-border/40">
        <p className="font-semibold text-text">{title || t.announcements.form.previewTitle}</p>
        <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">
          {content || t.announcements.form.previewBody}
        </p>
      </div>
    </div>
  );
}

function AnnouncementFormFields({
  title,
  content,
  target,
  onTitleChange,
  onContentChange,
  onTargetChange,
}: {
  title: string;
  content: string;
  target: AnnouncementAudience;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTargetChange: (v: AnnouncementAudience) => void;
}) {
  const audienceOptions = [
    { value: 'all', label: t.announcements.audiences.all },
    { value: 'groups', label: t.announcements.audiences.groups },
    { value: 'debtors', label: t.announcements.audiences.debtors },
    { value: 'teachers', label: t.announcements.audiences.teachers },
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <SelectField
        label={t.announcements.audience}
        options={audienceOptions}
        value={target}
        onChange={(e) => {
          if (isAudience(e.target.value)) onTargetChange(e.target.value);
        }}
      />
      <Field
        label={t.announcements.form.titleLabel}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text">{t.announcements.form.bodyLabel}</label>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={t.announcements.form.bodyPlaceholder}
          className="rounded-md border border-border bg-bg p-2.5 text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

function AnnouncementFormDrawer({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend?: (data: { title: string; content: string; target: AnnouncementAudience }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState<AnnouncementAudience>('all');

  const handleSend = () => {
    onSend?.({ title, content, target });
    onClose();
  };

  return (
    <Drawer open={open} title={t.announcements.new} closeLabel={t.common.cancel} onClose={onClose}>
      <AnnouncementFormFields
        title={title}
        content={content}
        target={target}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onTargetChange={setTarget}
      />
      <div className="mt-4 flex flex-col gap-4">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Paperclip className="size-4" aria-hidden />
          {t.announcements.form.attachFile}
        </button>
        <AnnouncementPreview title={title} content={content} />
        <Button onClick={handleSend}>
          <Send className="size-4" aria-hidden />
          {t.announcements.form.sendNow}
        </Button>
      </div>
    </Drawer>
  );
}

function AnnouncementStats({
  sent,
  delivered,
  failed,
}: {
  sent: number;
  delivered: number;
  failed: number;
}) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.announcements.stats.sent}</span>
        <p className="text-xl font-semibold text-text">{sent}</p>
      </Card>
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.announcements.stats.delivered}</span>
        <p className="text-xl font-semibold text-success">{delivered}</p>
      </Card>
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.announcements.stats.failed}</span>
        <p className="text-xl font-semibold text-danger">{failed}</p>
      </Card>
    </div>
  );
}

/** W-20 E'lonlar (FR-RPT-5). */
export function AnnouncementsView({ announcements, onSendAnnouncement }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalSent = announcements.reduce((acc, a) => acc + a.sentCount, 0);
  const totalDelivered = announcements.reduce((acc, a) => acc + a.deliveredCount, 0);
  const totalFailed = announcements.reduce((acc, a) => acc + a.failedCount, 0);

  return (
    <>
      <PageHeader
        title={t.announcements.title}
        description={t.announcements.subtitle}
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t.announcements.new}
          </Button>
        }
      />

      <AnnouncementStats sent={totalSent} delivered={totalDelivered} failed={totalFailed} />

      <DataTable
        data={announcements}
        columns={columns}
        getRowId={(r) => r.id}
        numeric={['sentCount', 'deliveryRate']}
        empty={{ title: t.announcements.empty }}
      />

      <AnnouncementFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSend={onSendAnnouncement}
      />
    </>
  );
}
