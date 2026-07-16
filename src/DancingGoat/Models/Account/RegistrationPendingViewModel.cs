namespace DancingGoat.Models
{
    public class RegistrationPendingViewModel
    {
        public string Email { get; set; }

        public string StatusMessage { get; set; }

        public ResendVerificationEmailViewModel ResendVerificationEmail { get; set; }
    }
}