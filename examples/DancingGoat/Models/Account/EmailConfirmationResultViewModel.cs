namespace DancingGoat.Models
{
    public class EmailConfirmationResultViewModel
    {
        public string Heading { get; set; }

        public string Message { get; set; }

        public string Email { get; set; }

        public bool ShowResendForm { get; set; }

        public bool ShowLoginLink { get; set; }

        public bool IsError { get; set; }

        public ResendVerificationEmailViewModel ResendVerificationEmail { get; set; }
    }
}