import { test, expect, type Page } from '@playwright/test';
import { load } from 'cheerio';

import { createEmailClient } from './emailClient';
import { appBaseUrl } from '../shared/config';

const registrationUrl = `${appBaseUrl}/account/register`;
const emailSubject = 'Confirm your email here';

type WaitForEmailResult = {
  structuredContent?: VirtualEmail;
  isError?: boolean;
};

type VirtualEmail = {
  virtualEmailBodyHTML?: string;
};

function extractConfirmationUrl(email: VirtualEmail): string {
  const htmlCandidates = [email.virtualEmailBodyHTML].filter((value): value is string => Boolean(value));

  for (const candidate of htmlCandidates) {
    const $ = load(candidate);
    const confirmationUrl = $('a[data-confirmation-url]').attr('href')
      ?? $('a[href*="/Registration/Confirm?"]').attr('href');

    if (confirmationUrl) {
      return confirmationUrl.replace(/&amp;/g, '&');
    }
  }

  throw new Error('Confirmation URL was not found in the registration email.');
}

async function registerAccount(page: Page, username: string, email: string, password: string) {
  await page.goto(registrationUrl);

  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();

  await page.locator('#UserName').fill(username);
  await page.locator('#Email').fill(email);
  await page.locator('#Password').fill(password);
  await page.locator('#PasswordConfirmation').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
}

test('registers, confirms email, and signs in', async ({ page }) => {
  const suffix = Date.now();
  const username = `playwright_reg_${suffix}`;
  const email = `playwright.reg.${suffix}@example.com`;
  const password = 'P@ssw0rd123!';
  const emailClient = await createEmailClient();

  try {
    await registerAccount(page, username, email, password);

    const message = (await emailClient.callTool({
      name: 'wait_for_email',
      arguments: {
        inbox: email,
        subjectContains: emailSubject,
        timeoutMs: 30000,
      },
    })) as WaitForEmailResult;

    expect(message.isError).not.toBe(true);

    const virtualEmail = message.structuredContent;

    expect(virtualEmail).toBeTruthy();

    if (!virtualEmail) {
      throw new Error('wait_for_email did not return structuredContent.');
    }

    const confirmationUrl = extractConfirmationUrl(virtualEmail);

    await page.goto(confirmationUrl);

    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
    await expect(page.getByText('Your email address has been confirmed. You can sign in now.')).toBeVisible();

    await page.getByRole('link', { name: 'GO TO SIGN IN' }).click();

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('User name').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(`${appBaseUrl}/`);
    await expect(page.getByRole('img', { name: 'avatar' })).toBeVisible();
  } finally {
    await emailClient.close();
  }
});