import { randomBytes } from "node:crypto";
import { google, gmail_v1 } from "googleapis";
import { decryptToken, encryptToken } from "./encryption.js";
import type { GmailRepository } from "./repository.js";
import type { GmailGateway, SyncMessage } from "../sync/contracts.js";
const GMAIL_READ_ONLY = "https://www.googleapis.com/auth/gmail.readonly";
const oauthClient = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)
    throw new Error("Google OAuth environment variables are not configured");
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
};
export class GoogleOAuthService {
  private pendingState: string | null = null;
  constructor(
    private readonly repository: GmailRepository,
    private readonly createAuth = oauthClient,
    private readonly createGmail = (auth: ReturnType<typeof oauthClient>) =>
      google.gmail({ version: "v1", auth }),
  ) {}
  startUrl(): string {
    this.pendingState = randomBytes(24).toString("base64url");
    return this.createAuth().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [GMAIL_READ_ONLY],
      state: this.pendingState,
    });
  }
  async complete(code: string, state: string): Promise<void> {
    if (!this.pendingState || state !== this.pendingState)
      throw new Error("Invalid OAuth state");
    this.pendingState = null;
    const auth = this.createAuth();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token)
      throw new Error("Google did not provide a refresh token");
    auth.setCredentials(tokens);
    const profile = await this.createGmail(auth).users.getProfile({
      userId: "me",
    });
    if (!profile.data.emailAddress)
      throw new Error("Google did not return a Gmail address");
    await this.repository.save(
      encryptToken(tokens.refresh_token),
      profile.data.emailAddress,
    );
  }
}
const decode = (value?: string | null): string =>
  value
    ? Buffer.from(
        value.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8")
    : "";
const bodyText = (payload?: gmail_v1.Schema$MessagePart): string => {
  if (!payload) return "";
  if (payload.mimeType === "text/plain") return decode(payload.body?.data);
  const plain = payload.parts?.find((part) => part.mimeType === "text/plain");
  return plain
    ? bodyText(plain)
    : (payload.parts?.map(bodyText).filter(Boolean).join("\n") ??
        decode(payload.body?.data));
};
const header = (
  payload: gmail_v1.Schema$MessagePart | undefined,
  name: string,
): string =>
  payload?.headers?.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase(),
  )?.value ?? "";
const gmailDateRangeQuery = (start: string, end: string): string => {
  const startBoundary = new Date(`${start}T00:00:00`);
  const endBoundary = new Date(`${end}T00:00:00`);
  endBoundary.setDate(endBoundary.getDate() + 1);
  return `after:${Math.floor(startBoundary.valueOf() / 1000) - 1} before:${Math.floor(endBoundary.valueOf() / 1000)}`;
};
export class GoogleGmailGateway implements GmailGateway {
  constructor(
    private readonly repository: GmailRepository,
    private readonly createClient?: () => Promise<gmail_v1.Gmail>,
  ) {}
  async listMessageIds(start: string, end: string): Promise<string[]> {
    const gmail = await this.client();
    const ids: string[] = [];
    let pageToken: string | undefined;
    try {
      do {
        const response = await gmail.users.messages.list({
          userId: "me",
          q: gmailDateRangeQuery(start, end),
          maxResults: 500,
          ...(pageToken ? { pageToken } : {}),
        });
        ids.push(
          ...(response.data.messages ?? []).flatMap((message) =>
            message.id ? [message.id] : [],
          ),
        );
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (error) {
      throw translateGoogleError(error);
    }
    return ids;
  }
  async getMessage(id: string): Promise<SyncMessage> {
    const gmail = await this.client();
    let response;
    try {
      response = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });
    } catch (error) {
      throw translateGoogleError(error);
    }
    return {
      id,
      from: header(response.data.payload, "from"),
      subject: header(response.data.payload, "subject"),
      text: bodyText(response.data.payload),
    };
  }
  getSourceMessage(id: string): Promise<SyncMessage> {
    return this.getMessage(id);
  }
  private async client() {
    if (this.createClient) return this.createClient();
    const encrypted = await this.repository.getEncryptedToken();
    if (!encrypted) throw new Error("Gmail is not connected");
    const auth = oauthClient();
    auth.setCredentials({ refresh_token: decryptToken(encrypted) });
    return google.gmail({ version: "v1", auth });
  }
}
const translateGoogleError = (error: unknown): Error => {
  const serialized = JSON.stringify(error);
  if (
    serialized.includes("invalid_grant") ||
    serialized.includes("unauthorized")
  )
    return new Error(
      "Gmail authorization expired; reconnect the Connected Gmail Account",
    );
  return error instanceof Error ? error : new Error("Gmail request failed");
};
