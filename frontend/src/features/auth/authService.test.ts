import { afterEach, describe, expect, it, vi } from "vitest"
import { ClientResponseError } from "pocketbase"

const { collection, clear, requestOTP, authWithOTP, authWithPassword } = vi.hoisted(() => ({
  collection: vi.fn(),
  clear: vi.fn(),
  requestOTP: vi.fn(),
  authWithOTP: vi.fn(),
  authWithPassword: vi.fn(),
}))

vi.mock("../../lib/pocketbase", () => ({
  pb: {
    collection,
    authStore: { clear, record: null, isValid: false },
  },
}))

import { AuthServiceError, authErrorCodes, loginWithPassword, requestOtp, verifyOtp } from "./authService"

const pocketBaseBadRequest = () => new ClientResponseError({ status: 400, response: { message: "Failed to request OTP.", data: {} } })

describe("auth service error classification", () => {
  afterEach(() => {
    vi.clearAllMocks()
    collection.mockReturnValue({ requestOTP, authWithOTP, authWithPassword })
  })

  it("classifies an unavailable OTP account without exposing whether it exists", async () => {
    collection.mockReturnValue({ requestOTP: requestOTP.mockRejectedValueOnce(pocketBaseBadRequest()) })

    const error = await requestOtp("unknown@example.test").catch((value: unknown) => value)

    expect(error).toBeInstanceOf(AuthServiceError)
    expect(error).toMatchObject({ status: 400, code: authErrorCodes.otpAccountUnavailable })
  })

  it("keeps network failures generic", async () => {
    collection.mockReturnValue({ requestOTP: requestOTP.mockRejectedValueOnce(new TypeError("fetch failed")) })

    const error = await requestOtp("member@example.test").catch((value: unknown) => value)

    expect(error).toBeInstanceOf(AuthServiceError)
    expect((error as AuthServiceError).code).toBeUndefined()
    expect((error as AuthServiceError).message).toBe("errors.generic")
  })

  it("returns the OTP id for a usable account", async () => {
    collection.mockReturnValue({ requestOTP: requestOTP.mockResolvedValueOnce({ otpId: "otp-123" }) })
    await expect(requestOtp("member@example.test")).resolves.toBe("otp-123")
  })

  it("does not classify an invalid OTP or admin password as an unavailable account", async () => {
    collection.mockReturnValue({ authWithOTP: authWithOTP.mockRejectedValueOnce(pocketBaseBadRequest()) })
    const otpError = await verifyOtp("otp-123", "000000").catch((value: unknown) => value)
    expect(otpError).toBeInstanceOf(AuthServiceError)
    expect((otpError as AuthServiceError).code).toBeUndefined()

    collection.mockReturnValue({ authWithPassword: authWithPassword.mockRejectedValueOnce(new ClientResponseError({ status: 401, response: { message: "Invalid credentials" } })) })
    const passwordError = await loginWithPassword("admin@example.test", "wrong").catch((value: unknown) => value)
    expect(passwordError).toBeInstanceOf(AuthServiceError)
    expect((passwordError as AuthServiceError).code).toBeUndefined()
  })
})
