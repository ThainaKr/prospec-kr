import { supabase } from "../supabase";

export type ProspecApiPayload = Record<string, unknown>;

export async function callProspecApi<T>(
  action: string,
  payload: ProspecApiPayload = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("prospec-api", {
    body: { action, payload },
  });

  if (error) {
    let message = error.message || "Não foi possível concluir.";
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const body = (await context.json()) as { error?: string };
        message = body.error || message;
      } catch {
        // Mantém a mensagem original quando a resposta não for JSON.
      }
    }

    throw new Error(message);
  }

  if (data?.error) throw new Error(String(data.error));
  return data?.data as T;
}
