'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

type Option = 'A' | 'B' | 'C' | 'D';

const OPTIONS: Option[] = ['A', 'B', 'C', 'D'];
const TOTAL_QUESTIONS = 20;

export default function AnswerKeyPage() {
  const initialAnswers = useMemo(() => {
    const data: Record<string, Option> = {};
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      data[String(i)] = 'A';
    }
    return data;
  }, []);

  const [title, setTitle] = useState('Nueva clave 20 preguntas');
  const [answers, setAnswers] = useState<Record<string, Option>>(initialAnswers);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateAnswer(questionNumber: number, value: Option) {
    setAnswers((prev) => ({
      ...prev,
      [String(questionNumber)]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/answer-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          totalQuestions: TOTAL_QUESTIONS,
          answers,
        }),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        setError('El servidor respondió con un formato inesperado');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la clave');
        return;
      }

      setMessage(`Clave guardada correctamente. ID: ${data.id}`);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar la clave');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-5xl">Crear nueva clave</h1>
            <p className="mt-2 text-base text-gray-600">
              Define la respuesta correcta para cada pregunta.
            </p>
          </div>

          <Link
            href="/answer-keys?from=create"
            className="inline-block rounded-xl border border-black px-5 py-3 text-base"
          >
            Ver claves guardadas
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="mb-2 block text-base font-medium">
              Título de la clave
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg outline-none"
              placeholder="Ej: Matemáticas grado 9"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
              const questionNumber = index + 1;

              return (
                <div
                  key={questionNumber}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="mb-3 text-lg font-semibold">
                    Pregunta {questionNumber}
                  </div>

                  <div className="flex gap-2">
                    {OPTIONS.map((option) => {
                      const selected = answers[String(questionNumber)] === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateAnswer(questionNumber, option)}
                          className={`rounded-lg border px-4 py-2 text-base font-medium ${
                            selected
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-black'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar clave'}
            </button>

            {message && <p className="text-base text-green-600">{message}</p>}
            {error && <p className="text-base text-red-600">{error}</p>}
          </div>
        </form>
      </div>
    </main>
  );
}