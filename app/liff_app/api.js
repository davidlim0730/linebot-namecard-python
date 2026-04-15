// api.js — backend API wrapper
// JWT is stored in sessionStorage (cleared when browser tab closes)

const BASE = "";  // same origin

function getToken() {
  return sessionStorage.getItem("jwt");
}

export function setToken(token) {
  sessionStorage.setItem("jwt", token);
}

export function clearToken() {
  sessionStorage.removeItem("jwt");
}

export function isAuthenticated() {
  return !!getToken();
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), { status: res.status, data });
  return data;
}

export async function login(id_token) {
  const data = await request("POST", "/api/auth/token", { id_token });
  setToken(data.access_token);
  return data;
}

export function listCards(search, tag) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return request("GET", `/api/v1/cards${qs ? "?" + qs : ""}`);
}

export function getCard(id) {
  return request("GET", `/api/v1/cards/${id}`);
}

export function updateCard(id, body) {
  return request("PUT", `/api/v1/cards/${id}`, body);
}

export function listTags() {
  return request("GET", "/api/v1/tags");
}

export function setCardTags(id, tag_names) {
  return request("POST", `/api/v1/cards/${id}/tags`, { tag_names });
}

// CRM endpoints
export function crmParse(raw_text) {
  return request("POST", "/api/v1/crm/parse", { raw_text });
}

export function crmConfirm(confirmed_data) {
  return request("POST", "/api/v1/crm/confirm", { confirmed_data });
}

// Deal endpoints
export function listDeals(stage, owner) {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (owner) params.set("owner", owner);
  const qs = params.toString();
  return request("GET", `/api/v1/deals${qs ? "?" + qs : ""}`);
}

export function getDeal(id) {
  return request("GET", `/api/v1/deals/${id}`);
}

export function updateDeal(id, body) {
  return request("PUT", `/api/v1/deals/${id}`, body);
}

export function listDealActivities(id) {
  return request("GET", `/api/v1/deals/${id}/activities`);
}

export function listDealStakeholders(id) {
  return request("GET", `/api/v1/deals/${id}/stakeholders`);
}

export function addDealStakeholder(id, body) {
  return request("POST", `/api/v1/deals/${id}/stakeholders`, body);
}

export function getPipelineSummary() {
  return request("GET", "/api/v1/pipeline/summary");
}

// Action endpoints
export function listActions(status) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return request("GET", `/api/v1/actions${qs ? "?" + qs : ""}`);
}

export function updateAction(id, body) {
  return request("PUT", `/api/v1/actions/${id}`, body);
}

// Product endpoints
export function listProducts() {
  return request("GET", "/api/v1/products");
}

export function createProduct(body) {
  return request("POST", "/api/v1/products", body);
}

export function updateProduct(id, body) {
  return request("PUT", `/api/v1/products/${id}`, body);
}

// Contact CRM view
export function getContactCrm(cardId) {
  return request("GET", `/api/v1/contacts/${cardId}/crm`);
}
