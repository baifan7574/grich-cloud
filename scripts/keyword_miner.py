import os
import requests
import json
import logging
import pandas as pd
from datetime import datetime, timedelta

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class GrichSeedEngine:
    """
    GRICH 种子引擎：自动化关键词采集器
    """
    def __init__(self):
        self.court_listener_api = "https://www.courtlistener.com/api/rest/v3/search/"
        # 实际使用时请替换为您的 API Key
        self.api_key = os.getenv("COURTLISTENER_API_KEY", "")
        self.target_industry = "Trademark Infringement"
        
    def fetch_recent_lawsuits(self, days=30):
        """
        调用 CourtListener API 获取最近的商标侵权案件并提取品牌名
        """
        logging.info(f"正在从 CourtListener 采集过去 {days} 天的商标侵权案件...")
        
        # 演示逻辑：在没有有效 API Key 的情况下提供 Mock 数据
        if not self.api_key:
            logging.warning("未检测到 API Key，正在生成模拟/手动导入数据包...")
            return self._get_mock_data()

        # 构造搜索参数
        date_from = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        params = {
            'q': 'trademark infringement',
            'type': 'd', # d = dockets
            'filed_after': date_from,
            'page_size': 50
        }
        headers = {'Authorization': f'Token {self.api_key}'}
        
        try:
            response = requests.get(self.court_listener_api, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                brands = self._extract_brands(data.get('results', []))
                return brands
            else:
                logging.error(f"API 请求失败: {response.status_code}")
                return self._get_mock_data()
        except Exception as e:
            logging.error(f"网络请求异常: {e}")
            return self._get_mock_data()

    def load_from_csv(self, file_path):
        """
        从 CSV 文件手动导入品牌名
        """
        if not os.path.exists(file_path):
            logging.error(f"文件不存在: {file_path}")
            return []
        
        df = pd.read_csv(file_path)
        # 假设 CSV 中有一列叫 'Brand'
        if 'Brand' in df.columns:
            brands = df['Brand'].unique().tolist()
            logging.info(f"从 CSV 成功导入 {len(brands)} 个品牌。")
            return brands
        return []

    def _extract_brands(self, results):
        """
        从案件标题或当事人中提取潜在品牌名
        """
        brands = []
        for case in results:
            case_name = case.get('case_name', "")
            # 简单逻辑：提取 "vs" 之前的原告或被告名称
            if " v. " in case_name:
                potential_brand = case_name.split(" v. ")[0].strip()
                brands.append(potential_brand)
        return list(set(brands))

    def _get_mock_data(self):
        """
        Mock 数据包，用于快速初始化项目演示
        """
        return ["Nike", "Adidas", "Apple Inc.", "LVMH", "Temu", "Shein", "Anker", "ZARA"]

    def save_to_database(self, brands):
        """
        将提取到的品牌保存到 Supabase/PostgreSQL (逻辑占位)
        """
        logging.info(f"准备将 {len(brands)} 个品牌持久化到数据库...")
        # 这里集成 Supabase SDK 进行入库
        # for brand in brands:
        #    supabase.table('keywords').upsert({'brand_name': brand, 'status': 'pending'}).execute()
        
        # 导出为初始化文件作为演示
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(script_dir, '../sql/initial_keywords.json')
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(brands, f, ensure_ascii=False, indent=4)
        logging.info(f"初始化品牌数据已导出至 {output_file}")

if __name__ == "__main__":
    engine = GrichSeedEngine()
    
    # 1. 尝试从网络采集
    findings = engine.fetch_recent_lawsuits()
    
    # 2. 如果有本地 CSV，则合并 (可选)
    # manual_findings = engine.load_from_csv("input/manual_brands.csv")
    # findings = list(set(findings + manual_findings))
    
    # 3. 持久化数据
    engine.save_to_database(findings)
