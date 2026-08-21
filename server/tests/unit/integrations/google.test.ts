import { afterEach, describe, expect, it } from "vitest";
import type { gmail_v1 } from "googleapis";

import { decryptToken } from "../../../src/modules/gmail/encryption.js";
import { GoogleGmailGateway, GoogleOAuthService } from "../../../src/modules/gmail/google.js";
import type { GmailRepository } from "../../../src/modules/gmail/repository.js";

afterEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY;
});

describe("Google adapters with fakes", () => {
  it("completes read-only OAuth and encrypts the refresh token", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "0".repeat(64);
    let storedToken = "";
    const repository = {
      async save(token: string) {
        storedToken = token;
      },
    } as unknown as GmailRepository;
    let issuedState = "";
    const auth = {
      generateAuthUrl(options: { scope: string[]; state: string }) {
        expect(options.scope).toEqual([
          "https://www.googleapis.com/auth/gmail.readonly",
        ]);
        issuedState = options.state;
        return `https://accounts.example.test?state=${options.state}`;
      },
      async getToken() {
        return { tokens: { refresh_token: "refresh-secret" } };
      },
      setCredentials() {},
    };
    const service = new GoogleOAuthService(
      repository,
      () => auth as never,
      () =>
        ({
          users: {
            getProfile: async () => ({
              data: { emailAddress: "owner@example.com" },
            }),
          },
        }) as never,
    );
    expect(service.startUrl()).toContain("accounts.example.test");
    await service.complete("code", issuedState);
    expect(decryptToken(storedToken)).toBe("refresh-secret");
  });

  it("paginates an inclusive Gmail Sync Window", async () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "UTC";
    const queries: unknown[] = [];
    let page = 0;
    const gmail = {
      users: {
        messages: {
          list: async (query: unknown) => {
            queries.push(query);
            page += 1;
            return page === 1
              ? { data: { messages: [{ id: "one" }], nextPageToken: "next" } }
              : { data: { messages: [{ id: "two" }] } };
          },
          get: async () => ({ data: {} }),
        },
      },
    } as unknown as gmail_v1.Gmail;
    const gateway = new GoogleGmailGateway(
      {} as GmailRepository,
      async () => gmail,
    );
    try {
      await expect(
        gateway.listMessageIds("2027-01-01", "2027-01-31"),
      ).resolves.toEqual(["one", "two"]);
      expect(queries[0]).toMatchObject({
        q: "after:1798761599 before:1801440000",
      });
      expect(queries[1]).toMatchObject({ pageToken: "next" });
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it("turns refresh-token rejection into an actionable reconnect error", async () => {
    const gmail = {
      users: {
        messages: {
          list: async () => {
            throw { response: { data: { error: "invalid_grant" } } };
          },
        },
      },
    } as unknown as gmail_v1.Gmail;
    const gateway = new GoogleGmailGateway(
      {} as GmailRepository,
      async () => gmail,
    );
    await expect(
      gateway.listMessageIds("2027-01-01", "2027-01-31"),
    ).rejects.toThrow("reconnect");
  });
});
