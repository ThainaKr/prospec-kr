import { createClient } from "npm:@supabase/supabase-js@2";

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

type Json = Record<string, unknown>;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
const serviceKey =
  secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const cleanEmail = (value: string | null) => (value ?? "").trim().toLowerCase();
const titleCaseFirst = (value: string | null | undefined) => {
  const clean = String(value ?? "").trim().toLocaleLowerCase("pt-BR");
  return clean ? clean.charAt(0).toLocaleUpperCase("pt-BR") + clean.slice(1) : "";
};
const cleanPhone = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

async function authenticate(request: Request) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessão não encontrada. Entre novamente.");

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || !profile.active || profile.status === "blocked") {
    throw new Error("Este e-mail não possui acesso ativo ao PROSPEC KR.");
  }

  const { data: permissions, error: permissionsError } = await admin
    .from("user_permissions")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (permissionsError) throw permissionsError;
  if (!permissions) throw new Error("As permissões deste usuário não foram configuradas.");

  await admin
    .from("profiles")
    .update({ last_access_at: new Date().toISOString() })
    .eq("id", profile.id);

  return { profile, permissions };
}

function requireAdmin(profile: Json) {
  if (profile.role !== "admin") {
    throw new Error("Esta ação é exclusiva da Administradora.");
  }
}

async function countRows(
  table: string,
  filters: Array<[string, string, unknown]> = [],
) {
  let query = admin.from(table).select("*", { count: "exact", head: true });
  for (const [method, field, value] of filters) {
    query = (query as unknown as Record<string, Function>)[method](
      field,
      value,
    );
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getLists() {
  const { data: lists, error } = await admin
    .from("contact_lists")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return Promise.all(
    (lists ?? []).map(async (list) => ({
      ...list,
      contacts_count: await countRows("contacts", [["eq", "list_id", list.id]]),
      recovery_count: await countRows("contacts", [
        ["eq", "list_id", list.id],
        ["eq", "queue_status", "recovery"],
      ]),
      scheduled_count: await (async () => {
        const { count, error: scheduledError } = await admin
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id)
          .or(
            "current_result.ilike.%agendou%,current_result.ilike.%agendamento%,current_result.ilike.%chamei para reunião%",
          );
        if (scheduledError) throw scheduledError;
        return count ?? 0;
      })(),
    })),
  );
}

async function getHome(profile: Json, payload: Json) {
  const listId = String(payload.listId ?? "");
  const messageType =
    profile.role !== "admin"
      ? "post_meeting_follow_up"
      : payload.messageType === "follow_up" ? "follow_up" : "first_message";
  if (!listId) return { queue: [], template: null };

  let queueQuery = admin
    .from("contacts")
    .select(
      "id,full_name,first_name,cpf,company,company_first_name,current_result,queue_position,queue_status,source_payload,list_id,assigned_to",
    )
    .eq("list_id", listId)
    .eq("pending", true)
    .neq("queue_status", "recovery")
    .neq("queue_status", "completed")
    .order("queue_position", { ascending: true, nullsFirst: false })
    .limit(1000);
  if (messageType === "first_message") {
    queueQuery = queueQuery.is("current_result", null);
  } else {
    queueQuery = queueQuery.or(
      "current_result.ilike.%retorn%,current_result.ilike.%sem resposta%,current_result.ilike.%vácuo%,current_result.ilike.%vacuo%,current_result.ilike.%mandei 1%msg%",
    );
  }
  if (profile.role !== "admin") {
    queueQuery = queueQuery.eq("assigned_to", profile.id);
  }
  const { data: contacts, error } = await queueQuery;
  if (error) throw error;

  const visibleContacts = (contacts ?? []).slice(0, 50);
  const ids = visibleContacts.map((contact) => contact.id);
  const { data: phones } = ids.length
    ? await admin
        .from("contact_phones")
        .select(
          "id,contact_id,phone_original,phone_normalized,status,is_primary,phone_order,exhausted",
        )
        .in("contact_id", ids)
        .eq("exhausted", false)
        .not("status", "in", '("invalid","landline","no_whatsapp")')
        .order("is_primary", { ascending: false })
        .order("phone_order", { ascending: true })
    : { data: [] };

  const { data: templates } = await admin
    .from("message_templates")
    .select("id,name,body,position,category")
    .eq("category", messageType)
    .eq("active", true)
    .or(`list_id.eq.${listId},list_id.is.null`)
    .order("position")
    .limit(300);

  const { data: chips } = await admin
    .from("chips")
    .select("id,name,number,operator,status,health_score")
    .eq("status", "active")
    .eq("auto_suspended", false)
    .order("created_at");

  return {
    queue: visibleContacts.map((contact) => {
      const sequence = Math.max(0, Number(contact.queue_position ?? 1) - 1);
      const contactPhones = (phones ?? []).filter(
        (phone) => phone.contact_id === contact.id,
      );
      const template =
        templates && templates.length ? templates[sequence % templates.length] : null;
      const chip = chips && chips.length ? chips[sequence % chips.length] : null;
      return {
        ...contact,
        full_name: titleCaseFirst(contact.full_name),
        first_name: titleCaseFirst(contact.first_name || String(contact.full_name || "").split(/\s+/)[0]),
        company: titleCaseFirst(contact.company),
        company_first_name: titleCaseFirst(contact.company_first_name || String(contact.company || "").split(/\s+/)[0]),
        phones: contactPhones,
        template,
        chip,
      };
    }),
    queue_count: contacts?.length ?? 0,
    template_count: templates?.length ?? 0,
    chip_count: chips?.length ?? 0,
  };
}

async function listContacts(profile: Json, payload: Json) {
  const listId = String(payload.listId ?? "");
  const search = String(payload.search ?? "").trim();
  const statusFilter = String(payload.statusFilter ?? "");
  const page = Math.max(0, Number(payload.page ?? 0));
  let query = admin
    .from("contacts")
    .select(
      "id,full_name,first_name,cpf,company,current_result,queue_status,last_activity_at,list_id",
      { count: "exact" },
    )
    .order("full_name")
    .range(page * 50, page * 50 + 49);
  if (listId) query = query.eq("list_id", listId);
  if (profile.role !== "admin") query = query.eq("assigned_to", profile.id);
  if (statusFilter === "scheduled") {
    query = query.or(
      "current_result.ilike.%agendou%,current_result.ilike.%agendamento%,current_result.ilike.%chamei para reunião%",
    );
  }
  if (search) {
    const safe = search.replace(/[%(),]/g, " ");
    query = query.or(
      `full_name.ilike.%${safe}%,cpf.ilike.%${safe}%,company.ilike.%${safe}%`,
    );
  }
  const { data: contacts, count, error } = await query;
  if (error) throw error;
  const ids = (contacts ?? []).map((contact) => contact.id);
  const { data: phones } = ids.length
    ? await admin
        .from("contact_phones")
        .select("id,contact_id,phone_normalized,phone_original,status,is_primary")
        .in("contact_id", ids)
    : { data: [] };
  return {
    contacts: (contacts ?? []).map((contact) => ({
      ...contact,
      phones: (phones ?? []).filter((phone) => phone.contact_id === contact.id),
    })),
    count: count ?? 0,
  };
}

async function getRecovery(profile: Json) {
  const { data, error } = await admin
    .from("contact_recovery")
    .select(
      "id,contact_id,original_list_id,status,telegram_query,attempts,recovered_phone,started_at,updated_at,contacts(full_name,first_name,cpf,company,assigned_to,support_lawyer_id),contact_lists(name)",
    )
    .neq("status", "recovered")
    .order("started_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  if (profile.role === "admin") return data ?? [];
  return (data ?? []).filter(
    (item) =>
      item.contacts?.assigned_to === profile.id ||
      item.contacts?.support_lawyer_id === profile.id,
  );
}

async function saveResult(profile: Json, payload: Json) {
  const contactId = String(payload.contactId ?? "");
  const result = String(payload.result ?? "").trim();
  const phoneId = payload.phoneId ? String(payload.phoneId) : null;
  if (!contactId || !result) throw new Error("Escolha o resultado do contato.");

  const { data: currentContact, error: currentError } = await admin
    .from("contacts")
    .select("assigned_to")
    .eq("id", contactId)
    .single();
  if (currentError) throw currentError;
  if (
    profile.role !== "admin" &&
    currentContact.assigned_to !== profile.id
  ) {
    throw new Error("Este contato não está atribuído ao seu perfil.");
  }

  const isRecovery = ["Sem WhatsApp", "Telefone inválido"].includes(result);
  const update: Json = {
    current_result: result,
    last_contact_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    updated_by_text: String(profile.email ?? ""),
    update_origin: "system",
  };
  if (isRecovery) update.queue_status = "recovery";

  const { error } = await admin.from("contacts").update(update).eq("id", contactId);
  if (error) throw error;

  if (phoneId && isRecovery) {
    await admin
      .from("contact_phones")
      .update({
        status: result === "Sem WhatsApp" ? "no_whatsapp" : "invalid",
        exhausted: true,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", phoneId);
  }

  await admin.from("contact_events").insert({
    contact_id: contactId,
    actor_id: profile.id,
    event_type: "prospecting_result",
    result,
    phone_id: phoneId,
    source_module: "home",
  });

  if (isRecovery) {
    const { data: contact } = await admin
      .from("contacts")
      .select("list_id,cpf")
      .eq("id", contactId)
      .single();
    await admin.from("contact_recovery").upsert(
      {
        contact_id: contactId,
        original_list_id: contact?.list_id,
        status: "waiting",
        telegram_query: contact?.cpf ? `/cpf ${contact.cpf}` : null,
        updated_by: profile.id,
      },
      { onConflict: "contact_id" },
    );
    await admin
      .from("operational_queue")
      .update({ status: "recovery", updated_at: new Date().toISOString() })
      .eq("contact_id", contactId);
  }
  return { ok: true };
}


async function saveWorkState(profile: Json, payload: Json) {
  const listId = payload.listId ? String(payload.listId) : null;
  const messageType = payload.messageType === "follow_up" ? "follow_up" : payload.messageType === "first_message" ? "first_message" : null;
  const { error } = await admin.from("user_work_state").upsert({
    user_id: profile.id,
    selected_list_id: listId,
    message_type: messageType,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  return { ok: true };
}

async function markInProgress(profile: Json, payload: Json) {
  const contactId = String(payload.contactId ?? "");
  if (!contactId) throw new Error("Contato inválido.");
  const { data: contact, error: contactError } = await admin
    .from("contacts").select("assigned_to").eq("id", contactId).single();
  if (contactError) throw contactError;
  if (profile.role !== "admin" && contact.assigned_to !== profile.id) {
    throw new Error("Este contato não está atribuído ao seu perfil.");
  }
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("contacts").update({ queue_status: "in_progress", last_activity_at: now }).eq("id", contactId),
    admin.from("operational_queue").update({ status: "in_progress", reserved_by: profile.id, reserved_at: now, updated_at: now }).eq("contact_id", contactId),
    admin.from("contact_events").insert({
      contact_id: contactId,
      actor_id: profile.id,
      event_type: "whatsapp_opened",
      chip_id: payload.chipId || null,
      template_id: payload.templateId || null,
      phone_id: payload.phoneId || null,
      source_module: "home",
    }),
  ]);
  return { ok: true };
}

async function getTemplates(profile: Json, payload: Json) {
  const category = String(payload.category ?? "first_message");
  let query = admin
    .from("message_templates")
    .select("*")
    .eq("category", category)
    .eq("active", true)
    .order("position");
  if (profile.role !== "admin") {
    query = query.eq("owner_id", profile.id);
  }
  const { data, error } = await query.limit(300);
  if (error) throw error;
  return data ?? [];
}

async function saveTemplate(profile: Json, payload: Json) {
  const body = String(payload.body ?? "").trim();
  const category = String(payload.category ?? "first_message");
  if (!body) throw new Error("Digite a mensagem antes de salvar.");
  const id = payload.id ? String(payload.id) : null;
  if (id) {
    const { error } = await admin
      .from("message_templates")
      .update({ body, name: String(payload.name ?? "Modelo") })
      .eq("id", id)
      .or(`owner_id.eq.${profile.id}${profile.role === "admin" ? ",is_shared.eq.true" : ""}`);
    if (error) throw error;
    return { ok: true, id };
  }

  const maxPosition = category === "first_message" || category === "follow_up" ? 300 : 100;
  const { data: last } = await admin
    .from("message_templates")
    .select("position")
    .eq("owner_id", profile.id)
    .eq("category", category)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = Math.min((last?.position ?? 0) + 1, maxPosition);
  const { data, error } = await admin
    .from("message_templates")
    .insert({
      owner_id: profile.id,
      name:
        String(payload.name ?? "").trim() ||
        `Modelo ${String(position).padStart(3, "0")}`,
      body,
      category,
      position,
      max_position: maxPosition,
      variables: ["NOME", "EMPRESA"],
      library_scope: profile.role === "admin" ? "admin" : "personal",
      is_shared: profile.role === "admin",
      active: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true, id: data.id };
}

async function deleteTemplate(profile: Json, payload: Json) {
  const id = String(payload.id ?? "");
  const { error } = await admin
    .from("message_templates")
    .update({ active: false })
    .eq("id", id)
    .or(`owner_id.eq.${profile.id}${profile.role === "admin" ? ",is_shared.eq.true" : ""}`);
  if (error) throw error;
  return { ok: true };
}

async function getAppointments(profile: Json, payload: Json) {
  const from = String(payload.from ?? new Date(Date.now() - 86400000).toISOString());
  const to = String(
    payload.to ?? new Date(Date.now() + 31 * 86400000).toISOString(),
  );
  let query = admin
    .from("appointments")
    .select(
      "*,contacts(full_name,company),owner:profiles!appointments_owner_id_fkey(full_name),support:profiles!appointments_support_lawyer_id_fkey(full_name)",
    )
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at");
  if (profile.role !== "admin") {
    query = query.or(
      `owner_id.eq.${profile.id},support_lawyer_id.eq.${profile.id}`,
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function saveAppointment(profile: Json, payload: Json) {
  const startsAt = String(payload.startsAt ?? "");
  const title = String(payload.title ?? "").trim();
  if (!title || !startsAt) throw new Error("Informe título, data e horário.");
  const endsAt = String(
    payload.endsAt || new Date(new Date(startsAt).getTime() + 3600000).toISOString(),
  );
  const data = {
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    owner_id: payload.ownerId || profile.id,
    created_by: profile.id,
    contact_id: payload.contactId || null,
    support_lawyer_id: payload.supportLawyerId || null,
    visibility: "common",
    status: payload.status || "scheduled",
    meeting_link: payload.meetingLink || null,
    notes: payload.notes || null,
  };
  if (payload.id) {
    const { error } = await admin
      .from("appointments")
      .update(data)
      .eq("id", String(payload.id));
    if (error) throw error;
  } else {
    const { error } = await admin.from("appointments").insert(data);
    if (error) throw error;
  }
  return { ok: true };
}

async function getChips(profile: Json) {
  requireAdmin(profile);
  const { data, error } = await admin
    .from("chips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function saveChip(profile: Json, payload: Json) {
  requireAdmin(profile);
  const number = cleanPhone(String(payload.number ?? ""));
  const name = String(payload.name ?? "").trim();
  if (!name || !number) throw new Error("Informe o nome e o número do chip.");
  const data = {
    name,
    number,
    operator: payload.operator || null,
    status: payload.status || "active",
    activated_at: payload.activatedAt || new Date().toISOString(),
  };
  const query = payload.id
    ? admin.from("chips").update(data).eq("id", String(payload.id))
    : admin.from("chips").insert(data);
  const { error } = await query;
  if (error) throw error;
  return { ok: true };
}

async function getUsers(profile: Json) {
  requireAdmin(profile);
  const [{ data: profiles }, { data: invites }] = await Promise.all([
    admin.from("profiles").select("*").order("full_name"),
    admin
      .from("user_invitations")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false }),
  ]);
  return { profiles: profiles ?? [], invitations: invites ?? [] };
}

async function inviteUser(profile: Json, payload: Json) {
  requireAdmin(profile);
  const email = cleanEmail(String(payload.email ?? ""));
  const fullName = String(payload.fullName ?? "").trim();
  const role = payload.role === "admin" ? "admin" : "lawyer";
  if (!email || !fullName) throw new Error("Informe nome e e-mail.");
  const { data: old } = await admin
    .from("user_invitations")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (old?.id) {
    const { error } = await admin
      .from("user_invitations")
      .update({
        full_name: fullName,
        role,
        honorific: payload.honorific || null,
        active: true,
        accepted_by: null,
        accepted_at: null,
        invited_by: profile.id,
        created_at: new Date().toISOString(),
      })
      .eq("id", old.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("user_invitations").insert({
      email,
      full_name: fullName,
      role,
      honorific: payload.honorific || null,
      active: true,
      invited_by: profile.id,
    });
    if (error) throw error;
  }
  return { ok: true, email };
}

async function getNotifications(profile: Json) {
  let query = admin
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (profile.role !== "admin") query = query.eq("recipient_id", profile.id);
  const { data } = await query;
  const unreadIds = (data ?? [])
    .filter((item) => !item.read_at)
    .map((item) => item.id);
  if (unreadIds.length) {
    await admin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }
  return data ?? [];
}

async function getReports(profile: Json) {
  const { data: contacts, error } = await admin
    .from("contacts")
    .select("current_result,list_id,queue_status,recovered,assigned_to");
  if (error) throw error;
  const visible =
    profile.role === "admin"
      ? contacts ?? []
      : (contacts ?? []).filter((contact) => contact.assigned_to === profile.id);
  const distribution = visible.reduce<Record<string, number>>((acc, contact) => {
    const key = contact.current_result || "Sem resultado";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  let appointmentsQuery = admin
    .from("appointments")
    .select("*", { count: "exact", head: true });
  let contractsQuery = admin
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("status", "signed");
  let messagesQuery = admin
    .from("message_attempts")
    .select("*", { count: "exact", head: true });
  if (profile.role !== "admin") {
    appointmentsQuery = appointmentsQuery.or(
      `owner_id.eq.${profile.id},support_lawyer_id.eq.${profile.id}`,
    );
    contractsQuery = contractsQuery.or(
      `responsible_lawyer_id.eq.${profile.id},support_lawyer_id.eq.${profile.id}`,
    );
    messagesQuery = messagesQuery.eq("actor_id", profile.id);
  }
  const [
    { count: appointmentsCount },
    { count: contractsCount },
    { count: messagesCount },
  ] = await Promise.all([appointmentsQuery, contractsQuery, messagesQuery]);
  return {
    total: visible.length,
    pending: visible.filter((contact) => contact.queue_status === "waiting").length,
    recovery: visible.filter((contact) => contact.queue_status === "recovery").length,
    recovered: visible.filter((contact) => contact.recovered).length,
    distribution,
    appointments: appointmentsCount ?? 0,
    contracts: contractsCount ?? 0,
    messages: messagesCount ?? 0,
  };
}

async function recoverContact(profile: Json, payload: Json) {
  requireAdmin(profile);
  const recoveryId = String(payload.recoveryId ?? "");
  const phone = cleanPhone(String(payload.phone ?? ""));
  if (!recoveryId || !phone) throw new Error("Informe o novo telefone.");
  const { data: recovery, error } = await admin
    .from("contact_recovery")
    .select("contact_id,original_list_id")
    .eq("id", recoveryId)
    .single();
  if (error) throw error;
  const { data: phoneRow, error: phoneError } = await admin
    .from("contact_phones")
    .insert({
      contact_id: recovery.contact_id,
      phone_original: phone,
      phone_normalized: phone,
      status: "valid",
      is_primary: true,
      recovered_via: "telegram",
      whatsapp_found_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (phoneError) throw phoneError;
  const { data: maxRow } = await admin
    .from("operational_queue")
    .select("position")
    .eq("list_id", recovery.original_list_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = Number(maxRow?.position ?? 0) + 1;
  await Promise.all([
    admin
      .from("contact_recovery")
      .update({
        status: "recovered",
        recovered_phone: phone,
        recovered_phone_id: phoneRow.id,
        completed_at: new Date().toISOString(),
        updated_by: profile.id,
      })
      .eq("id", recoveryId),
    admin
      .from("contacts")
      .update({
        list_id: recovery.original_list_id,
        queue_status: "returned_to_end",
        recovered: true,
        recovery_status: "recovered",
        queue_position: nextPosition,
        pending: true,
      })
      .eq("id", recovery.contact_id),
    admin
      .from("operational_queue")
      .update({
        list_id: recovery.original_list_id,
        status: "returned_to_end",
        position: nextPosition,
        last_returned_to_end_at: new Date().toISOString(),
      })
      .eq("contact_id", recovery.contact_id),
  ]);
  return { ok: true };
}

async function importSpreadsheet(profile: Json, payload: Json) {
  requireAdmin(profile);
  const lists = Array.isArray(payload.lists) ? payload.lists as Json[] : [];
  if (!lists.length) throw new Error("A planilha não possui listas válidas.");
  if (lists.length > 50) throw new Error("A planilha excede o limite de 50 abas.");

  let created = 0;
  let updated = 0;
  let recoveryCount = 0;

  for (const rawList of lists) {
    const name = String(rawList.name ?? "").trim().slice(0, 120);
    const contacts = Array.isArray(rawList.contacts)
      ? rawList.contacts as Json[]
      : [];
    if (!name || !contacts.length) continue;

    const { data: existingList, error: listLookupError } = await admin
      .from("contact_lists")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (listLookupError) throw listLookupError;

    let listId = existingList?.id;
    if (!listId) {
      const { data: insertedList, error: listInsertError } = await admin
        .from("contact_lists")
        .insert({
          name,
          active: true,
          paused: false,
          spreadsheet_tab: name,
        })
        .select("id")
        .single();
      if (listInsertError) throw listInsertError;
      listId = insertedList.id;
    }

    const { data: lastQueue } = await admin
      .from("contacts")
      .select("queue_position")
      .eq("list_id", listId)
      .order("queue_position", { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextPosition = Number(lastQueue?.queue_position ?? 0) + 1;

    for (const rawContact of contacts.slice(0, 5000)) {
      const fullName = String(rawContact.fullName ?? "").trim().slice(0, 180);
      const cpf = String(rawContact.cpf ?? "").replace(/\D/g, "").slice(0, 11);
      const company = String(rawContact.company ?? "").trim().slice(0, 180);
      const result = String(rawContact.result ?? "").trim().slice(0, 120);
      const phones = Array.isArray(rawContact.phones)
        ? [...new Set(rawContact.phones.map((phone) => cleanPhone(String(phone))).filter(Boolean))]
        : [];
      const isRecovery = rawContact.recovery === true;
      const isScheduled =
        rawContact.scheduled === true ||
        /agendou|agendament|chamei para reuni[aã]o/i.test(result);
      const isFollowUp =
        /retorn|sem resposta|vácuo|vacuo|mandei 1.*msg/i.test(result);
      const isActionable = !result || isFollowUp;
      if (!fullName && !cpf && !phones.length) continue;

      let lookup = admin
        .from("contacts")
        .select("id")
        .eq("list_id", listId);
      if (cpf) lookup = lookup.eq("cpf", cpf);
      else lookup = lookup.ilike("full_name", fullName).ilike("company", company || "");
      const { data: existingContact, error: lookupError } = await lookup
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const contactData = {
        list_id: listId,
        full_name: fullName || "Contato sem nome",
        first_name: fullName.split(/\s+/)[0] || "",
        cpf: cpf || null,
        company: company || null,
        company_first_name: company.split(/\s+/)[0] || null,
        current_result: result || (isRecovery ? "Sem WhatsApp" : null),
        queue_status: isRecovery
          ? "recovery"
          : isScheduled
            ? "scheduled"
            : isActionable
              ? "waiting"
              : "completed",
        pending: isActionable && !isRecovery,
        source_payload: rawContact.sourcePayload ?? {},
        update_origin: "spreadsheet_upload",
        updated_by_text: String(profile.email ?? ""),
      };

      let contactId = existingContact?.id;
      if (contactId) {
        const { error } = await admin
          .from("contacts")
          .update(contactData)
          .eq("id", contactId);
        if (error) throw error;
        updated += 1;
      } else {
        const queuePosition = nextPosition++;
        const { data, error } = await admin
          .from("contacts")
          .insert({ ...contactData, queue_position: queuePosition })
          .select("id")
          .single();
        if (error) throw error;
        contactId = data.id;
        const { error: queueError } = await admin.from("operational_queue").insert({
          list_id: listId,
          contact_id: contactId,
          position: queuePosition,
          status: isRecovery ? "recovery" : "waiting",
        });
        if (queueError) throw queueError;
        created += 1;
      }

      for (let phoneIndex = 0; phoneIndex < phones.length; phoneIndex += 1) {
        const phone = phones[phoneIndex];
        const { data: existingPhone } = await admin
          .from("contact_phones")
          .select("id")
          .eq("contact_id", contactId)
          .eq("phone_normalized", phone)
          .maybeSingle();
        if (!existingPhone) {
          const { error } = await admin.from("contact_phones").insert({
            contact_id: contactId,
            phone_original: phone,
            phone_normalized: phone,
            status: isRecovery ? "no_whatsapp" : "unverified",
            exhausted: isRecovery,
            is_primary: phoneIndex === 0,
            phone_order: phoneIndex + 1,
          });
          if (error) throw error;
        }
      }

      if (isRecovery) {
        recoveryCount += 1;
        await admin.from("contact_recovery").upsert(
          {
            contact_id: contactId,
            original_list_id: listId,
            status: "waiting",
            telegram_query: cpf ? `/cpf ${cpf}` : null,
            updated_by: profile.id,
          },
          { onConflict: "contact_id" },
        );
      }
    }
  }

  return { created, updated, recovery: recoveryCount };
}

async function exportSpreadsheet(profile: Json) {
  requireAdmin(profile);
  const { data: lists, error: listsError } = await admin
    .from("contact_lists")
    .select("id,name")
    .eq("active", true)
    .order("name");
  if (listsError) throw listsError;

  const result = [];
  for (const list of lists ?? []) {
    const { data: contacts, error } = await admin
      .from("contacts")
      .select("id,full_name,cpf,company,current_result,queue_status,recovered")
      .eq("list_id", list.id)
      .order("queue_position", { ascending: true, nullsFirst: false })
      .limit(5000);
    if (error) throw error;
    const ids = (contacts ?? []).map((contact) => contact.id);
    const { data: phones } = ids.length
      ? await admin
          .from("contact_phones")
          .select("contact_id,phone_original,phone_normalized,phone_order")
          .in("contact_id", ids)
          .order("phone_order")
      : { data: [] };
    result.push({
      name: list.name,
      rows: (contacts ?? []).map((contact) => {
        const contactPhones = (phones ?? []).filter(
          (phone) => phone.contact_id === contact.id,
        );
        return {
          Nome: contact.full_name,
          CPF: contact.cpf || "",
          Empresa: contact.company || "",
          Telefone: contactPhones[0]?.phone_original || contactPhones[0]?.phone_normalized || "",
          "Telefone 2": contactPhones[1]?.phone_original || contactPhones[1]?.phone_normalized || "",
          "Telefone 3": contactPhones[2]?.phone_original || contactPhones[2]?.phone_normalized || "",
          Resultado: contact.current_result || "",
          Fila: contact.queue_status || "",
          Recuperado: contact.recovered ? "Sim" : "Não",
        };
      }),
    });
  }
  return { lists: result };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Método inválido." }, 405);
  try {
    const { profile, permissions } = await authenticate(request);
    const body = (await request.json()) as Json;
    const action = String(body.action ?? "bootstrap");
    const payload = (body.payload ?? {}) as Json;
    const permissionByAction: Record<string, string> = {
      home: "can_view_home",
      lists: "can_view_lists",
      contacts: "can_view_contacts",
      recovery: "can_view_recovery",
      record_result: "can_send",
      templates: "can_view_message_templates",
      save_template: "can_manage_templates",
      delete_template: "can_manage_templates",
      appointments: "can_view_agenda",
      save_appointment: "can_view_agenda",
      notifications: "can_view_notifications",
      reports: "can_view_reports",
      import_spreadsheet: "can_view_lists",
      export_spreadsheet: "can_view_lists",
      save_work_state: "can_view_lists",
      mark_in_progress: "can_view_lists",
    };
    const permissionKey = permissionByAction[action];
    if (
      permissionKey &&
      profile.role !== "admin" &&
      permissions[permissionKey] !== true
    ) {
      throw new Error("Seu perfil não possui permissão para esta ação.");
    }

    let data: unknown;
    switch (action) {
      case "bootstrap": {
        const lists = await getLists();
        const recovery = await getRecovery(profile);
        const contactFilters: Array<[string, string, unknown]> =
          profile.role === "admin" ? [] : [["eq", "assigned_to", profile.id]];
        const notificationFilters: Array<[string, string, unknown]> = [
          ["is", "read_at", null],
        ];
        if (profile.role !== "admin") {
          notificationFilters.push(["eq", "recipient_id", profile.id]);
        }
        data = {
          profile,
          permissions,
          lists,
          work_state: (await admin.from("user_work_state").select("*").eq("user_id", profile.id).maybeSingle()).data,
          counters: {
            contacts: await countRows("contacts", contactFilters),
            recovery: recovery.length,
            notifications: await countRows(
              "notifications",
              notificationFilters,
            ),
          },
        };
        break;
      }
      case "home":
        data = await getHome(profile, payload);
        break;
      case "lists":
        data = await getLists();
        break;
      case "contacts":
        data = await listContacts(profile, payload);
        break;
      case "recovery":
        data = await getRecovery(profile);
        break;
      case "record_result":
        data = await saveResult(profile, payload);
        break;
      case "save_work_state":
        data = await saveWorkState(profile, payload);
        break;
      case "mark_in_progress":
        data = await markInProgress(profile, payload);
        break;
      case "templates":
        data = await getTemplates(profile, payload);
        break;
      case "save_template":
        data = await saveTemplate(profile, payload);
        break;
      case "delete_template":
        data = await deleteTemplate(profile, payload);
        break;
      case "appointments":
        data = await getAppointments(profile, payload);
        break;
      case "save_appointment":
        data = await saveAppointment(profile, payload);
        break;
      case "chips":
        data = await getChips(profile);
        break;
      case "save_chip":
        data = await saveChip(profile, payload);
        break;
      case "users":
        data = await getUsers(profile);
        break;
      case "invite_user":
        data = await inviteUser(profile, payload);
        break;
      case "notifications":
        data = await getNotifications(profile);
        break;
      case "reports":
        data = await getReports(profile);
        break;
      case "recover_contact":
        data = await recoverContact(profile, payload);
        break;
      case "import_spreadsheet":
        data = await importSpreadsheet(profile, payload);
        break;
      case "export_spreadsheet":
        data = await exportSpreadsheet(profile);
        break;
      default:
        return json({ error: "Ação não encontrada." }, 404);
    }
    return json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível concluir.";
    const status = /convite|exclusiva|autorizad/i.test(message) ? 403 : 400;
    return json({ error: message }, status);
  }
});
