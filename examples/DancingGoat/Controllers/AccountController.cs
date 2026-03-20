using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using CMS.Core;
using CMS.EmailEngine;
using CMS.Websites;

using DancingGoat.Models;
using DancingGoat.Services;
using Kentico.Content.Web.Mvc;
using Kentico.Membership;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace DancingGoat.Controllers
{
    public class AccountController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IStringLocalizer<SharedResources> localizer,
        IEventLogService eventLogService,
        IContentRetriever contentRetriever,
        IEmailService emailService,
        HttpRequestService httpRequestService,
        IStringLocalizer<SharedResources> stringLocalizer,
        IOptions<SystemEmailOptions> systemEmailOptions) : Controller
    {

        // GET: Account/Login
        [HttpGet]
        [AllowAnonymous]
        public ActionResult Login()
        {
            return View();
        }


        // POST: Account/Login
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Login(LoginViewModel model, string returnUrl, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var signInResult = SignInResult.Failed;

            try
            {
                signInResult = await signInManager.PasswordSignInAsync(model.UserName, model.Password, model.StaySignedIn, false);
            }
            catch (Exception ex)
            {
                eventLogService.LogException("AccountController", "Login", ex);
            }

            if (signInResult.IsNotAllowed)
            {
                var member = await userManager.FindByNameAsync(model.UserName);

                if ((member != null) && !await userManager.IsEmailConfirmedAsync(member))
                {
                    ModelState.AddModelError(string.Empty, localizer["Your email address has not been confirmed yet. Please check your inbox for the verification email."].ToString());
                    ViewData["ResendVerificationEmailModel"] = CreateResendVerificationEmailModel(member.Email);

                    return View(model);
                }
            }

            if (signInResult.Succeeded)
            {
                var decodedReturnUrl = WebUtility.UrlDecode(returnUrl);
                if (!string.IsNullOrEmpty(decodedReturnUrl) && Url.IsLocalUrl(decodedReturnUrl))
                {
                    return Redirect(decodedReturnUrl);
                }

                return Redirect(await GetHomeWebPageUrl(cancellationToken));
            }

            ModelState.AddModelError(string.Empty, localizer["Your sign-in attempt was not successful. Please try again."].ToString());

            return View(model);
        }


        // POST: Account/Logout 
        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Logout(CancellationToken cancellationToken = default)
        {
            await signInManager.SignOutAsync();
            return Redirect(await GetHomeWebPageUrl(cancellationToken));
        }


        // GET: Account/Register
        [AllowAnonymous]
        public ActionResult Register()
        {
            return View();
        }


        // POST: Account/Register
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Register(RegisterViewModel model, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var member = new ApplicationUser
            {
                UserName = model.UserName,
                Email = model.Email,
                Enabled = false,
                EmailConfirmed = false
            };

            var registerResult = new IdentityResult();

            try
            {
                registerResult = await userManager.CreateAsync(member, model.Password);
            }
            catch (Exception ex)
            {
                eventLogService.LogException("AccountController", "Register", ex);
                ModelState.AddModelError(string.Empty, localizer["Your registration was not successful."]);
            }

            if (registerResult.Succeeded)
            {
                string statusMessage = null;

                try
                {
                    await SendVerificationEmail(member);
                }
                catch (Exception ex)
                {
                    eventLogService.LogException("AccountController", "SendVerificationEmail", ex);
                    statusMessage = localizer["Your account was created, but we could not send the verification email automatically. Use the form below to request a new email."].ToString();
                }

                return View("RegistrationPending", CreateRegistrationPendingViewModel(member.Email, statusMessage));
            }

            foreach (var error in registerResult.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            return View(model);
        }


        [HttpGet(ApplicationConstants.CONFIRM_REGISTRATION_ACTION_PATH)]
        [AllowAnonymous]
        public async Task<ActionResult> ConfirmRegistration([FromQuery] string email, [FromQuery] string token)
        {
            string decodedEmail = HttpUtility.UrlDecode(email) ?? string.Empty;
            string decodedToken = HttpUtility.UrlDecode(token) ?? string.Empty;

            if (string.IsNullOrWhiteSpace(decodedEmail) || string.IsNullOrWhiteSpace(decodedToken))
            {
                return View("ConfirmationResult", CreateConfirmationResultViewModel(
                    localizer["Email confirmation failed"].ToString(),
                    localizer["The confirmation link is invalid or incomplete. Request a new verification email and try again."].ToString(),
                    decodedEmail,
                    showResendForm: !string.IsNullOrWhiteSpace(decodedEmail),
                    isError: true));
            }

            try
            {
                var member = await userManager.FindByEmailAsync(decodedEmail);

                if (member is null)
                {
                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Email confirmation failed"].ToString(),
                        localizer["We could not find an account for that confirmation link."].ToString(),
                        decodedEmail,
                        showResendForm: true,
                        isError: true));
                }

                if (await userManager.IsEmailConfirmedAsync(member))
                {
                    if (!member.Enabled)
                    {
                        member.Enabled = true;

                        var enableExistingMemberResult = await userManager.UpdateAsync(member);
                        if (!enableExistingMemberResult.Succeeded)
                        {
                            return View("ConfirmationResult", CreateConfirmationResultViewModel(
                                localizer["Email confirmation failed"].ToString(),
                                GetIdentityErrorMessage(enableExistingMemberResult, localizer["Your email address has already been confirmed, but we could not finish activating your account."].ToString()),
                                member.Email,
                                isError: true));
                        }
                    }

                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Email already confirmed"].ToString(),
                        localizer["Your email address has already been confirmed. You can sign in now."].ToString(),
                        member.Email,
                        showLoginLink: true));
                }

                var confirmResult = await userManager.ConfirmEmailAsync(member, decodedToken);

                if (!confirmResult.Succeeded)
                {
                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Email confirmation failed"].ToString(),
                        GetIdentityErrorMessage(confirmResult, localizer["We could not confirm your email address. Request a new verification email and try again."].ToString()),
                        member.Email,
                        showResendForm: true,
                        isError: true));
                }

                member.Enabled = true;

                var enableMemberResult = await userManager.UpdateAsync(member);
                if (!enableMemberResult.Succeeded)
                {
                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Email confirmation failed"].ToString(),
                        GetIdentityErrorMessage(enableMemberResult, localizer["Your email address was confirmed, but we could not finish activating your account."].ToString()),
                        member.Email,
                        isError: true));
                }

                return View("ConfirmationResult", CreateConfirmationResultViewModel(
                    localizer["Email confirmed"].ToString(),
                    localizer["Your email address has been confirmed. You can sign in now."].ToString(),
                    member.Email,
                    showLoginLink: true));
            }
            catch (Exception ex)
            {
                eventLogService.LogException("AccountController", "ConfirmRegistration", ex);

                return View("ConfirmationResult", CreateConfirmationResultViewModel(
                    localizer["Email confirmation failed"].ToString(),
                    localizer["We could not process the confirmation link. Request a new verification email and try again."].ToString(),
                    decodedEmail,
                    showResendForm: !string.IsNullOrWhiteSpace(decodedEmail),
                    isError: true));
            }
        }


        [HttpPost(ApplicationConstants.RESEND_VERIFICATION_EMAIL)]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ResendVerificationEmail(ResendVerificationEmailViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View("ConfirmationResult", CreateConfirmationResultViewModel(
                    localizer["Verification email"].ToString(),
                    localizer["Enter a valid email address to request a new verification email."].ToString(),
                    model.Email,
                    showResendForm: true,
                    isError: true));
            }

            try
            {
                var member = await userManager.FindByEmailAsync(model.Email);

                if (member is null)
                {
                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Verification email"].ToString(),
                        localizer["We could not find an account for that email address."].ToString(),
                        model.Email,
                        showResendForm: true,
                        isError: true));
                }

                if (await userManager.IsEmailConfirmedAsync(member))
                {
                    if (!member.Enabled)
                    {
                        member.Enabled = true;
                        await userManager.UpdateAsync(member);
                    }

                    return View("ConfirmationResult", CreateConfirmationResultViewModel(
                        localizer["Email already confirmed"].ToString(),
                        localizer["Your email address has already been confirmed. You can sign in now."].ToString(),
                        member.Email,
                        showLoginLink: true));
                }

                await SendVerificationEmail(member);

                return View("RegistrationPending", CreateRegistrationPendingViewModel(
                    member.Email,
                    localizer["We sent a new verification email. Check your inbox and follow the confirmation link to activate your account."].ToString()));
            }
            catch (Exception ex)
            {
                eventLogService.LogException("AccountController", "ResendVerificationEmail", ex);

                return View("ConfirmationResult", CreateConfirmationResultViewModel(
                    localizer["Verification email"].ToString(),
                    localizer["We could not send a new verification email right now. Please try again."].ToString(),
                    model.Email,
                    showResendForm: true,
                    isError: true));
            }
        }


        private async Task<string> GetHomeWebPageUrl(CancellationToken cancellationToken = default)
        {
            var homePage = (await contentRetriever.RetrievePages<HomePage>(
                RetrievePagesParameters.Default,
                query => query.UrlPathColumns(),
                new RetrievalCacheSettings("UrlPathColumns"),
                cancellationToken
            )).FirstOrDefault();

            return homePage.GetUrl().RelativePath;
        }

        private RegistrationPendingViewModel CreateRegistrationPendingViewModel(string email, string statusMessage = null) => new()
        {
            Email = email,
            StatusMessage = statusMessage,
            ResendVerificationEmail = CreateResendVerificationEmailModel(email)
        };

        private EmailConfirmationResultViewModel CreateConfirmationResultViewModel(string heading, string message, string email = null, bool showResendForm = false, bool showLoginLink = false, bool isError = false) => new()
        {
            Heading = heading,
            Message = message,
            Email = email,
            ShowResendForm = showResendForm,
            ShowLoginLink = showLoginLink,
            IsError = isError,
            ResendVerificationEmail = CreateResendVerificationEmailModel(email)
        };

        private ResendVerificationEmailViewModel CreateResendVerificationEmailModel(string email) => new()
        {
            Email = email
        };

        private static string GetIdentityErrorMessage(IdentityResult result, string fallbackMessage)
        {
            string message = string.Join(" ", result.Errors.Select(error => error.Description));

            return string.IsNullOrWhiteSpace(message) ? fallbackMessage : message;
        }

        private async Task SendVerificationEmail(ApplicationUser member)
        {
            if (member is null || string.IsNullOrWhiteSpace(member.Email) || member.Enabled)
            {
                return;
            }

            string confirmToken = await userManager.GenerateEmailConfirmationTokenAsync(member);
            string memberEmail = member.Email;

            string encodedMemberEmail = HttpUtility.UrlEncode(memberEmail) ?? string.Empty;
            string encodedConfirmToken = HttpUtility.UrlEncode(confirmToken);


            string absoluteURL = httpRequestService.GetAbsoluteUrlForPath(ApplicationConstants.CONFIRM_REGISTRATION_ACTION_PATH, true);

            if (string.IsNullOrWhiteSpace(absoluteURL))
            {
                return;
            }

            string confirmationURL = QueryHelpers.AddQueryString(
                absoluteURL,
                new Dictionary<string, string?>
                {
                    ["email"] = encodedMemberEmail,
                    ["token"] = encodedConfirmToken
                });

            await emailService.SendEmail(new EmailMessage()
            {
                From = $"no-reply@{systemEmailOptions.Value.SendingDomain}",
                Recipients = member.Email,
                Subject = $"{stringLocalizer["Confirm your email here"]}",
                Body = $"""
                <p>{stringLocalizer["To confirm your email address, click"]} <a data-confirmation-url href="{confirmationURL}">{stringLocalizer["here"]}</a>.</p>
                <p style="margin-bottom: 1rem;">{stringLocalizer["You can also copy-paste the following URL into your browser:"]}</p>
                <p>{confirmationURL}</p>
                """
            });
        }
    }
}
