import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import './styles/global.css';
import { AppProviders } from './app/AppProviders';
import { AppRouter } from './app/router';
import { enableMocking } from './mocks/enable';
import { applyThemeVariables } from './styles/tokens';
import { getInitialTheme } from './utils/theme';

// Publish the semantic palette before the first paint; the provider keeps it in sync afterwards.
applyThemeVariables(getInitialTheme());

async function bootstrap(): Promise<void> {
  try {
    await enableMocking();
  } catch (error) {
    console.error('MSW 启动失败，应用将继续运行但模拟 API 不可用。', error);
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </React.StrictMode>,
  );
}

void bootstrap();
