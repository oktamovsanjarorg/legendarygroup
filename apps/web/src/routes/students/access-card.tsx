import type { StudentAccessCodeResult, StudentDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, CardTitle } from '@lg/ui-web';
import { Check, Copy, KeyRound, RefreshCw, Unlink } from 'lucide-react';
import { useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { useStudentCall } from './use-students.js';

const c = t.studentCard;

function StatusRows({ s }: { s: StudentDetail }) {
  return (
    <div className="flex flex-col gap-3 divide-y divide-border">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-text-muted">{c.telegram}</span>
        <Badge tone={s.telegramLinked ? 'success' : 'muted'}>
          {s.telegramLinked ? c.linked : c.notLinked}
        </Badge>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-medium text-text-muted">{c.accessCode}</span>
        <Badge tone={s.accessCodeSet ? 'success' : 'muted'}>
          {s.accessCodeSet ? c.codeSet : c.codeNotSet}
        </Badge>
      </div>
    </div>
  );
}

function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-primary/20 bg-primary-bg/10 p-4">
      <span className="text-xs font-medium text-text-muted">{c.codeGeneratedTitle}</span>
      <span className="font-mono text-3xl font-bold tracking-widest text-primary">{code}</span>
      <p className="text-center text-xs text-text-muted">{c.codeGeneratedHint}</p>
      <Button variant="secondary" size="sm" onClick={() => void copyCode()}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        {copied ? c.copied : c.copyCode}
      </Button>
    </div>
  );
}

interface ActionsProps {
  s: StudentDetail;
  loadingCode: boolean;
  loadingUnlink: boolean;
  onGenerate: () => void;
  onUnlink: () => void;
}

function ActionButtons({ s, loadingCode, loadingUnlink, onGenerate, onUnlink }: ActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Button variant="secondary" size="sm" loading={loadingCode} onClick={onGenerate}>
        {s.accessCodeSet ? (
          <RefreshCw className="size-4" aria-hidden />
        ) : (
          <KeyRound className="size-4" aria-hidden />
        )}
        {s.accessCodeSet ? c.resetCode : c.generateCode}
      </Button>

      {s.telegramLinked && (
        <Button variant="ghost" size="sm" loading={loadingUnlink} onClick={onUnlink}>
          <Unlink className="size-4" aria-hidden />
          {c.unlinkTelegram}
        </Button>
      )}
    </div>
  );
}

interface ViewProps extends ActionsProps {
  canManage: boolean;
  newCode: string | null;
  error: unknown;
}

/** W-06 «Mini Appʼga kirish» bloki — koʻrinish (Storybook ham shuni koʻrsatadi). */
export function StudentAccessView({ s, canManage, newCode, error, ...actions }: ViewProps) {
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>{c.miniAppAccess}</CardTitle>
      <StatusRows s={s} />
      {newCode && <CodeDisplay code={newCode} />}
      {canManage && <ActionButtons s={s} {...actions} />}
      <FormError error={error} />
    </Card>
  );
}

interface Props {
  s: StudentDetail;
  canManage: boolean;
}

/**
 * W-06 Oʻquvchi kartochkasida "Mini App'ga kirish" bloki (T-126).
 */
export function StudentAccessCard({ s, canManage }: Props) {
  const codeAct = useStudentCall<StudentAccessCodeResult>();
  const unlinkAct = useStudentCall();
  const [newCode, setNewCode] = useState<string | null>(null);

  const handleGenerateCode = async () => {
    if (!window.confirm(c.confirmGenerateCode)) return;
    try {
      const res = await codeAct.mutateAsync({
        path: `/students/${s.id}/access-code`,
        method: 'POST',
      });
      setNewCode(res.code);
    } catch {
      // xato act.error orqali ko'rinadi
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!window.confirm(c.confirmUnlinkTelegram)) return;
    try {
      await unlinkAct.mutateAsync({
        path: `/students/${s.id}/telegram-unlink`,
        method: 'POST',
      });
    } catch {
      // xato act.error orqali ko'rinadi
    }
  };

  return (
    <StudentAccessView
      s={s}
      canManage={canManage}
      newCode={newCode}
      error={codeAct.error ?? unlinkAct.error}
      loadingCode={codeAct.isPending}
      loadingUnlink={unlinkAct.isPending}
      onGenerate={() => void handleGenerateCode()}
      onUnlink={() => void handleUnlinkTelegram()}
    />
  );
}
