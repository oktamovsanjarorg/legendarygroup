import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { QueryView } from '../data/query-view.js';
import { useAddComment, useTeacherStudent } from '../data/student.js';
import { CommentComposer } from '../screens/teacher/comment-composer.js';
import { StudentView } from '../screens/teacher/student.js';
import { useMe } from '../session/session.js';

const FROM = '/group/$groupId/student/$id';

/** MT-06 o'quvchi profili (T-114). Ota-ona telefoni ko'rsatilmaydi (Q-63). */
export function TeacherStudentPage() {
  const { groupId, id } = useParams({ from: FROM });
  const me = useMe();
  const navigate = useNavigate();
  const query = useTeacherStudent(groupId, id, me.id);
  return (
    <QueryView query={query} empty={{ when: (d) => d === null, title: t.groups.empty }}>
      {(d) =>
        d && (
          <StudentView
            profile={d.profile}
            canComment={d.canComment}
            onAddComment={() =>
              d.lastLesson &&
              void navigate({
                to: '/group/$groupId/student/$id/comment/$lessonId',
                params: { groupId, id, lessonId: d.lastLesson },
              })
            }
          />
        )
      }
    </QueryView>
  );
}

export function TeacherCommentPage() {
  const { groupId, id, lessonId } = useParams({ from: `${FROM}/comment/$lessonId` });
  const me = useMe();
  const navigate = useNavigate();
  const query = useTeacherStudent(groupId, id, me.id);
  const save = useAddComment(lessonId, id);
  return (
    <QueryView query={query}>
      {(d) => (
        <>
          {save.isError && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {errorText(save.error)}
            </p>
          )}
          <CommentComposer
            studentName={d?.profile.name ?? ''}
            saving={save.isPending}
            onSave={(text, visibility) =>
              save.mutate(
                { text, visibility },
                { onSuccess: () => void navigate({ to: FROM, params: { groupId, id } }) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}
