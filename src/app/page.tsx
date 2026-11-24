import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-3 text-4xl font-bold md:text-6xl">
          Calificador de exámenes
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Crea claves, selecciónalas y usa la cámara del celular para tomar la foto de la hoja.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/answer-keys?home=1"
            className="rounded-2xl border border-gray-200 p-6 transition hover:border-black"
          >
            <h2 className="mb-2 text-3xl font-semibold">Calificar examen</h2>
            <p className="text-lg text-gray-600">
              Elige una clave y captura la hoja del estudiante con cámara o galería.
            </p>
          </Link>

          <Link
            href="/answer-key?home=1"
            className="rounded-2xl border border-gray-200 p-6 transition hover:border-black"
          >
            <h2 className="mb-2 text-3xl font-semibold">Crear clave</h2>
            <p className="text-lg text-gray-600">
              Define las respuestas correctas de las preguntas.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}