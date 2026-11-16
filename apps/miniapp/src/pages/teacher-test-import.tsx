import type { ImportPreviewResponse, TestDetailResponse } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import {
  confirmImportBody,
  fileBase64,
  toColumnMaps,
  toImportRows,
  validateExcelFile,
} from '../data/tests-map.js';
import {
  useDownloadTemplate,
  useImportConfirm,
  useImportPreview,
  usePublishTest,
  useTestDetail,
} from '../data/tests.js';
import { type ImportRow, TestImportView } from '../screens/teacher/test-import.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

const FROM = '/group/$id/tests/$testId/import';

function useTestImport(testId: string) {
  const previewMutation = useImportPreview(testId);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [decisions, setDecisions] = useState<ReadonlyMap<number, 'accept' | 'reject'>>(new Map());
  const [fileName, setFileName] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();

  const handleFileSelect = async (file: File) => {
    const valid = validateExcelFile(file);
    if (!valid.ok) return setFileError(valid.error);
    setFileError(undefined);
    try {
      const b64 = await fileBase64(file);
      previewMutation.mutate(b64, {
        onSuccess: (res) => {
          setPreview(res);
          setFileName(file.name);
          setDecisions(new Map());
        },
      });
    } catch {
      setFileError(t.testImport.fileUnreadable);
    }
  };

  /** Import saqlangach — ko'rib chiqish yopiladi, ro'yxat serverdagi natijalardan (e'lon qilish ochiladi). */
  const reset = () => {
    setPreview(null);
    setFileName(undefined);
    setDecisions(new Map());
  };

  const handleDecide = (row: number, decision: 'accept' | 'reject') => {
    setDecisions((prev) => new Map(prev).set(row, decision));
  };

  return {
    preview,
    decisions,
    fileName,
    fileError,
    isPending: previewMutation.isPending,
    handleFileSelect,
    handleDecide,
    reset,
  };
}

/** MT-08 Excel import va ko'rib chiqish (FR-GRD-4, BR-35). */
export function TeacherTestImportPage() {
  const { id, testId } = useParams({ from: FROM });
  const me = useMe();
  const online = useOnline();

  const groupQuery = useTeacherGroup(id, me.id);
  const detailQuery = useTestDetail(testId);
  const confirmMutation = useImportConfirm(testId, id);
  const publishMutation = usePublishTest(testId, id);
  const downloadTemplate = useDownloadTemplate();
  const imp = useTestImport(testId);

  // Q-62: yordamchi ustoz natijalarni ko'radi, o'zgartirmaydi (API ham shunday).
  const canManage = groupQuery.data?.group.role === 'main';

  const handleImport = () => {
    if (!canManage || !imp.preview || !online || confirmMutation.isPending) return;
    confirmMutation.mutate(confirmImportBody(imp.preview, imp.decisions), {
      onSuccess: imp.reset,
    });
  };
  const handlePublish = () => {
    if (!canManage || !online || publishMutation.isPending) return;
    publishMutation.mutate();
  };
  const actionError = confirmMutation.error ?? publishMutation.error;

  return (
    <QueryView query={detailQuery}>
      {(test) => (
        <TestImportContent
          test={test}
          preview={imp.preview}
          decisions={imp.decisions}
          fileName={imp.fileName}
          fileError={imp.fileError ?? (actionError ? errorText(actionError) : undefined)}
          online={online}
          canManage={canManage}
          isImporting={imp.isPending || confirmMutation.isPending}
          onFileSelect={imp.handleFileSelect}
          onDownloadTemplate={() => downloadTemplate.mutate(testId)}
          onDecide={imp.handleDecide}
          onImport={handleImport}
          onPublish={handlePublish}
        />
      )}
    </QueryView>
  );
}

function TestImportContent(p: {
  test: TestDetailResponse;
  preview: ImportPreviewResponse | null;
  decisions: ReadonlyMap<number, 'accept' | 'reject'>;
  fileName?: string;
  fileError?: string;
  online: boolean;
  canManage: boolean;
  isImporting: boolean;
  onFileSelect: (file: File) => void;
  onDownloadTemplate: () => void;
  onDecide: (row: number, decision: 'accept' | 'reject') => void;
  onImport: () => void;
  onPublish: () => void;
}) {
  const rows: ImportRow[] = p.preview
    ? toImportRows(p.preview, p.decisions)
    : p.test.results.map((r, i) => ({
        row: i + 1,
        kind: 'matched',
        name: r.studentName ?? '—',
        score: r.score,
      }));
  const canPublish = p.test.status === 'draft' && p.test.results.length > 0 && !p.preview;
  return (
    <TestImportView
      testName={p.test.title}
      maxScore={p.test.maxScore}
      columns={toColumnMaps(p.test.sections)}
      rows={rows}
      importing={p.isImporting}
      reviewing={p.preview !== null}
      canManage={p.canManage}
      fileName={p.fileName}
      fileError={p.fileError}
      isPublished={p.test.status === 'published'}
      canPublish={canPublish && p.online}
      onFileSelect={p.onFileSelect}
      onDownloadTemplate={p.onDownloadTemplate}
      onDecide={p.onDecide}
      onImport={p.onImport}
      onPublish={p.onPublish}
    />
  );
}
