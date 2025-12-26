import sequelize from './src/config/database';
import SystemSetting from './src/models/systemSetting';

async function enableAds() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        await SystemSetting.upsert({
            key: 'ads_enabled',
            value: 'true'
        });

        console.log('Ads enabled successfully!');

        const settings = await SystemSetting.findAll();
        console.log('Current settings:', settings.map(s => ({ key: s.key, value: s.value })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

enableAds();
