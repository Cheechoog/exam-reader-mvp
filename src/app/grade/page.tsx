'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type AnswerKey = {
  id: string;
  title: string;
  totalQuestions: number;
  answersJson: Record<string, string>;
  createdAt: string;
};

export default function GradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const answerKeyId = searchParams.get('answerKeyId');

  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadAnswerKey() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/answer-keys', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          setError('No se pudieron cargar las claves');
          return;
        }

        const found = data.find((item: AnswerKey) => item.id === answerKeyId);

        if (!found) {
          setError('No se encontró la clave seleccionada');
          return;
        }

        setAnswerKey(found);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error cargando la clave');
      } finally {
        setLoading(false);
      }
    }

    if (!answerKeyId) {
      setError('Falta seleccionar una clave');
      setLoading(false);
      return;
    }

    loadAnswerKey();
  }, [answerKeyId]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  async function handleProcess() {
    if (!selectedFile || !answerKeyId) {
      setError('Debes seleccionar una imagen antes de procesar');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const formData = new FormData();
      formData.append('answerKeyId', answerKeyId);
      formData.append('studentName', studentName);
      formData.append('file', selectedFile);

      const res = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo procesar la hoja');
        return;
      }

      router.push(`/result/${data.id}`);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error procesando la hoja');
    } finally {
      setProcessing(false);
    }
  }

  const questionsPreview = useMemo(() => {
    if (!answerKey) return [];
    return Object.entries(answerKey.answersJson).slice(0, 8);
  }, [answerKey]);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold">Calificar examen</h1>
        <p className="mb-8 text-sm text-gray-600">
          Selecciona una imagen desde cámara o galería para procesar la hoja de respuestas.
        </p>

        {loading && <p className="text-sm text-gray-600">Cargando clave...</p>}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && answerKey && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-200 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{answerKey.title}</h2>
                  <p className="text-sm text-gray-600">
                    {answerKey.totalQuestions} preguntas
                  </p>
                </div>

                <span className="rounded-md bg-gray-100 px-3 py-1 text-xs">
                  Clave seleccionada
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {questionsPreview.map(([question, answer]) => (
                  <div
                    key={question}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">P{question}:</span> {answer}
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Vista parcial de la clave. Luego compararemos la hoja del estudiante contra esta respuesta.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 p-6">
              <h3 className="mb-4 text-lg font-semibold">Datos del estudiante</h3>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nombre del estudiante
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none"
                  placeholder="Ej: Laura Gómez"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 p-6">
              <h3 className="mb-4 text-lg font-semibold">Captura de la hoja</h3>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="rounded-lg bg-black px-5 py-3 text-white"
                >
                  Tomar foto
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="rounded-lg border border-black px-5 py-3"
                >
                  Subir imagen
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {!previewUrl && (
                <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-sm text-gray-500">
                  Aquí aparecerá la vista previa de la foto o imagen seleccionada.
                </div>
              )}

              {previewUrl && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <img
                      src={previewUrl}
                      alt="Vista previa de la hoja"
                      className="max-h-[520px] w-auto rounded-lg border border-gray-200"
                    />
                  </div>

                  <div className="text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Archivo:</span>{' '}
                      {selectedFile?.name || 'Sin nombre'}
                    </p>
                    <p>
                      <span className="font-medium">Tamaño:</span>{' '}
                      {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : '-'}
                    </p>
                    <p>
                      <span className="font-medium">Estudiante:</span>{' '}
                      {studentName || 'Sin nombre'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-60"
                    onClick={handleProcess}
                    disabled={processing}
                  >
                    {processing ? 'Procesando...' : 'Procesar examen'}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}