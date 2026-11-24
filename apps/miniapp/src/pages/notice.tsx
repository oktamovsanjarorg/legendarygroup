import { errorText } from '@lg/ui-core';

/** Amal xatosi (11-ux §4.6): server matni — `errorMessages`dan. */
export const ErrorNotice = ({ error }: { error: unknown }) =>
  error ? (
    <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
      {errorText(error)}
    </p>
  ) : null;

export const OkNotice = ({ text }: { text: string | null }) =>
  text ? (
    <p role="status" className="mx-4 mt-3 rounded-xl bg-success-bg p-3 text-sm text-success">
      {text}
    </p>
  ) : null;
