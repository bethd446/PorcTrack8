describe('PorcTrack E2E - Flux principaux', () => {
    it('devrait lancer l app et ouvrir le QuickPeseeForm', async () => {
        const appRoot = await $('#root');
        await appRoot.waitForExist({ timeout: 15000, timeoutMsg: "L'application React n'a pas charge a temps" });

        const btnPesee = await $('button[aria-label="Pesée"]');
        await btnPesee.waitForClickable({ timeout: 10000 });
        await btnPesee.click();

        const formText = await $('//*[contains(text(), "Sujet")]');
        await formText.waitForExist({ timeout: 5000 });
        await expect(formText).toBeDisplayed();
    });
});
