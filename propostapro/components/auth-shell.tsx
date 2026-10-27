import Link from "next/link";

export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">PropostaPro</Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">{titulo}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitulo}</p>
        </div>
        <div className="card p-7">{children}</div>
      </div>
    </div>
  );
}

export function Divisor() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-xs text-gray-400">ou</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}
