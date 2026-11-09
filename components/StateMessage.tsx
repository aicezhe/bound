export function Loading() {
  return (
    <p className="sub" role="status">
      Загружаю…
    </p>
  );
}

export function ErrorMessage({ text }: { text: string }) {
  return (
    <p className="error" role="alert">
      {text}
    </p>
  );
}
