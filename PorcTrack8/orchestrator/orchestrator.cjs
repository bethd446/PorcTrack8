const fs = require('fs');
const path = require('path');

const TASK_DIR = '/root/PorcTrack8/PorcTrack8/orchestrator/tasks/';

console.log('--- 🧠 Orchestrateur Élite : Mode Conscience Activé ---');

setInterval(() => {
    fs.readdirSync(TASK_DIR).filter(f => f.endsWith('.json')).forEach(filename => {
        const filePath = path.join(TASK_DIR, filename);
        try {
            const task = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`📡 Orchestrateur : Tâche reçue [${task.id}] -> ${task.goal}`);
            // Délégation automatique (Hermes tool: delegate_task)
            // Dans un environnement réel, on invoquerait ici l'API de délégation
            fs.unlinkSync(filePath);
        } catch (e) { console.error('Erreur Orchestration:', e); }
    });
}, 3000);
