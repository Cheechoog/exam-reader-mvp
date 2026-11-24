'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type AnswerKey = {
  id: string;
  title: string;
  totalQuestions: number;
  answersJson: Record<string, string>;
  createdAt: string;
};

export default function AnswerKeysPage() {
  const [keys, setKeys] = useState<AnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadKeys() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/answer-keys', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          setError('No se pudieron cargar las claves');
          return;
        }

        setKeys(data);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error cargando las claves');
      } finally {
        setLoading(false);
      }
    }

    loadKeys();
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-5xl">Claves guardadas</h1>
            <p className="mt-2 text-base text-gray-600">
              Aquí puedes ver las claves creadas para tus exámenes.
            </p>
          </div>

          <Link
            href="/answer-key?new=1"
            className="inline-block rounded-xl bg-black px-5 py-3 text-white"
          >
            Nueva clave
          </Link>
        </div>

        {loading && <p className="text-base text-gray-600">Cargando claves...</p>}

        {error && <p className="text-base text-red-600">{error}</p>}

        {!loading && !error && keys.length === 0 && (
          <div className="rounded-2xl border border-gray-200 p-6">
            <p className="text-base text-gray-600">Aún no has creado claves.</p>
          </div>
        )}

        {!loading && !error && keys.length > 0 && (
          <div className="grid gap-5">
            {keys.map((key) => (
              <div
                key={key.id}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{key.title}</h2>
                    <p className="text-lg text-gray-600">
                      {key.totalQuestions} preguntas
                    </p>
                  </div>

                  <span className="inline-block rounded-md bg-gray-100 px-3 py-2 text-sm">
                    {new Date(key.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {Object.entries(key.answersJson).map(([question, answer]) => (
                    <div
                      key={question}
                      className="rounded-lg border border-gray-200 px-4 py-3 text-lg"
                    >
                      <span className="font-medium">P{question}:</span> {answer}
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <Link
                    href={`/grade?answerKeyId=${key.id}`}
                    className="inline-block rounded-xl border border-black px-5 py-3 text-base"
                  >
                    Calificar con esta clave
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}