<>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gestão de Obra Simplificada</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <style
    dangerouslySetInnerHTML={{
      __html:
        "\n        body {\n            font-family: 'Inter', sans-serif;\n            background-color: #f0f4f8; /* Cor de fundo suave */\n        }\n        .container {\n            max-width: 1000px;\n        }\n        .card {\n            background-color: #ffffff;\n            border-radius: 1.5rem; /* Borda mais arredondada */\n            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);\n            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;\n            cursor: pointer;\n        }\n        .card:hover {\n            transform: translateY(-5px);\n            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);\n        }\n        .btn-primary {\n            background-color: #4f46e5; /* Índigo */\n            color: #ffffff;\n            border-radius: 9999px; /* Botão completamente arredondado */\n            transition: background-color 0.2s ease-in-out;\n        }\n        .btn-primary:hover {\n            background-color: #4338ca;\n        }\n        .btn-secondary {\n            background-color: #e2e8f0;\n            color: #4a5568;\n            border-radius: 9999px;\n            transition: background-color 0.2s ease-in-out;\n        }\n        .btn-secondary:hover {\n            background-color: #cbd5e0;\n        }\n        input, select, textarea {\n            border-radius: 0.75rem;\n            border: 1px solid #d1d5db;\n            padding: 0.75rem;\n            width: 100%;\n            background-color: #f9fafb;\n        }\n        input:focus, select:focus, textarea:focus {\n            outline: none;\n            border-color: #4f46e5;\n            box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);\n        }\n        .modal {\n            background-color: rgba(0, 0, 0, 0.5);\n        }\n        .modal-content {\n            background-color: #ffffff;\n            border-radius: 1.5rem;\n            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);\n            padding: 2rem;\n        }\n        table {\n            border-collapse: collapse;\n            width: 100%;\n        }\n        th, td {\n            text-align: left;\n            padding: 12px;\n            border-bottom: 1px solid #e5e7eb;\n        }\n        th {\n            background-color: #e2e8f0;\n            font-weight: 600;\n        }\n        tr:hover {\n            background-color: #f1f5f9;\n        }\n        .loading-overlay {\n            position: fixed;\n            top: 0;\n            left: 0;\n            width: 100%;\n            height: 100%;\n            background-color: rgba(255, 255, 255, 0.8);\n            display: flex;\n            flex-direction: column;\n            justify-content: center;\n            align-items: center;\n            z-index: 100;\n            font-size: 2rem;\n            color: #4f46e5;\n        }\n    "
    }}
  />
  <div id="loadingOverlay" className="loading-overlay">
    <p id="loadingMessage">Carregando dados da obra...</p>
    <p className="text-sm text-gray-500 mt-2">
      Isso pode levar alguns segundos na primeira vez.
    </p>
  </div>
  <div
    id="messageModal"
    className="modal fixed inset-0 z-50 flex items-center justify-center p-4 hidden"
  >
    <div className="modal-content w-full max-w-sm text-center">
      <h3 id="messageTitle" className="text-xl font-bold mb-4 text-gray-800" />
      <p id="messageText" className="text-gray-600 mb-6" />
      <button
        id="closeMessageBtn"
        className="btn-primary w-full py-2 font-semibold"
      >
        OK
      </button>
    </div>
  </div>
  <div
    id="confirmModal"
    className="modal fixed inset-0 z-50 flex items-center justify-center p-4 hidden"
  >
    <div className="modal-content w-full max-w-sm text-center">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Confirmação</h3>
      <p id="confirmText" className="text-gray-600 mb-6">
        Tem certeza que deseja excluir esta despesa?
      </p>
      <div className="flex justify-around space-x-4">
        <button
          id="confirmYesBtn"
          className="btn-primary w-1/2 py-2 font-semibold"
        >
          Sim
        </button>
        <button
          id="confirmNoBtn"
          className="btn-1/2 py-2 font-semibold bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-full"
        >
          Não
        </button>
      </div>
    </div>
  </div>
  <div id="mainContainer" className="container mx-auto hidden">
    <header className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
        Gestão de Obra <span className="text-indigo-500">(Simplificada)</span>
      </h1>
      <p className="text-lg text-gray-600">Simples, organizado e eficiente.</p>
    </header>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
      <div
        id="newExpenseCard"
        className="card p-6 flex flex-col items-center text-center lg:col-span-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16 text-indigo-500 mb-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1={12} y1={5} x2={12} y2={19} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700">Nova Despesa</h3>
        <p className="text-gray-500 text-sm mt-1">Registrar um novo gasto.</p>
      </div>
      <div
        id="budgetDisplayCard"
        className="card p-6 flex flex-col justify-center lg:col-span-1"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-500 text-sm">Previsto</p>
            <p
              id="budgetedValue"
              className="text-2xl font-bold text-green-600 mt-1"
            >
              R$ 0,00
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Realizado</p>
            <p
              id="actualValue"
              className="text-2xl font-bold text-red-600 mt-1"
            >
              R$ 0,00
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Saldo</p>
            <p
              id="balanceValue"
              className="text-2xl font-bold text-gray-800 mt-1"
            >
              R$ 0,00
            </p>
          </div>
        </div>
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2.5">
          <div
            id="budgetProgressBar"
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: "0%" }}
          />
        </div>
        <p
          id="budgetProgressText"
          className="text-sm text-center text-gray-500 mt-2"
        >
          0% do orçamento usado
        </p>
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-center font-semibold text-gray-700 mb-2">
            Linha do Tempo da Obra
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-gray-500 text-sm">Início</p>
              <p
                id="startDateDisplay"
                className="text-md font-semibold text-gray-800 mt-1"
              >
                Não definido
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Duração</p>
              <p
                id="durationDisplay"
                className="text-md font-semibold text-gray-800 mt-1"
              >
                0 meses, 0 dias
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <section className="mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Relatórios e Resumo
      </h2>
      <div className="card p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          Custos por Categoria
        </h3>
        <div className="mb-4 flex justify-center">
          <div className="w-[300px] h-[300px]">
            <canvas id="categoryChart" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button id="exportCsvBtn" className="btn-secondary py-2 px-4 flex-1">
            Exportar para CSV
          </button>
          <button id="exportPdfBtn" className="btn-secondary py-2 px-4 flex-1">
            Gerar Relatório em PDF
          </button>
        </div>
      </div>
    </section>
    <section className="mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Backup de Dados</h2>
      <div className="card p-6">
        <p className="text-gray-600 mb-4">
          Salve seus dados em um arquivo local ou restaure-os de um backup.
        </p>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button id="exportJsonBtn" className="btn-secondary py-2 px-4 flex-1">
            Salvar Backup (JSON)
          </button>
          <label
            htmlFor="importJsonFile"
            className="btn-secondary py-2 px-4 flex-1 text-center cursor-pointer"
          >
            Restaurar Backup (JSON)
          </label>
          <input
            type="file"
            id="importJsonFile"
            className="hidden"
            accept=".json"
          />
        </div>
      </div>
    </section>
    <section className="mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Últimas Despesas
      </h2>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative w-full md:w-2/5">
          <input
            type="text"
            id="searchFilter"
            placeholder="Buscar por descrição..."
            className="w-full pl-10"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
        </div>
        <select id="categoryFilter" className="w-full md:w-1/5">
          <option value="all">Categoria (Todos)</option>
          <option value="material">Materiais</option>
          <option value="mao-de-obra">Mão de Obra</option>
          <option value="equipamento">Equipamentos</option>
          <option value="servico">Serviços</option>
          <option value="outros">Outros</option>
        </select>
        <select id="monthFilter" className="w-full md:w-1/5">
          <option value="all">Mês (Todos)</option>
        </select>
        <select id="yearFilter" className="w-full md:w-1/5">
          <option value="all">Ano (Todos)</option>
        </select>
      </div>
      <div id="expenseListContainer" className="card p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody id="expenseTableBody"></tbody>
        </table>
        <p
          id="noExpensesMessage"
          className="text-center text-gray-500 mt-4 hidden"
        >
          Nenhuma despesa registrada ainda.
        </p>
        <p
          id="noResultsMessage"
          className="text-center text-gray-500 mt-4 hidden"
        >
          Nenhum resultado encontrado.
        </p>
      </div>
    </section>
  </div>
  <div
    id="expenseModal"
    className="modal fixed inset-0 z-50 flex items-center justify-center p-4 hidden"
  >
    <div className="modal-content w-full max-w-lg overflow-y-auto max-h-[90vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 id="expenseModalTitle" className="text-2xl font-bold text-gray-800">
          Registrar Despesa
        </h2>
        <button
          id="closeModalBtn"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <form id="expenseForm" className="space-y-4">
        <div>
          <label
            htmlFor="expenseDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data
          </label>
          <input type="date" id="expenseDate" name="expenseDate" required="" />
        </div>
        <div>
          <label
            htmlFor="expenseCategory"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Categoria
          </label>
          <select id="expenseCategory" name="expenseCategory" required="">
            <option value="">Selecione a categoria</option>
            <option value="material">Material</option>
            <option value="mao-de-obra">Mão de Obra</option>
            <option value="equipamento">Equipamento</option>
            <option value="servico">Serviço</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div id="dynamicFields" className="space-y-4">
          <div id="materialFields" className="hidden space-y-4">
            <div>
              <label
                htmlFor="materialName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição do Material
              </label>
              <input
                type="text"
                id="materialName"
                name="materialName"
                placeholder="Ex: Saco de Cimento"
              />
            </div>
            <div>
              <label
                htmlFor="materialUnit"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unidade de Medida
              </label>
              <select id="materialUnit" name="materialUnit">
                <option value="">Selecione a unidade</option>
                <option value="metro">Metro (m)</option>
                <option value="m2">Metro Quadrado (m²)</option>
                <option value="m3">Metro Cúbico (m³)</option>
                <option value="saco-50kg">Saco 50kg</option>
                <option value="saco-20kg">Saco 20Kg</option>
                <option value="lata-18l">Lata 18 litros</option>
                <option value="lata-3.6l">Lata 3,6 litros</option>
                <option value="lata-900ml">Lata 900ml</option>
                <option value="caminhao">Caminhão</option>
                <option value="milheiro">Milheiro</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="materialQuantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Quantidade
              </label>
              <input
                type="number"
                id="materialQuantity"
                name="materialQuantity"
                step="0.01"
                min={0}
                placeholder={0.0}
              />
            </div>
            <div>
              <label
                htmlFor="materialPrice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preço Unitário (R$)
              </label>
              <input
                type="number"
                id="materialPrice"
                name="materialPrice"
                step="0.01"
                min={0}
                placeholder={0.0}
              />
            </div>
          </div>
          <div id="manpowerFields" className="hidden space-y-4">
            <div>
              <label
                htmlFor="manpowerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do Profissional
              </label>
              <input
                type="text"
                id="manpowerName"
                name="manpowerName"
                placeholder="Ex: Pedreiro João"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="manpowerDuration"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Duração
                </label>
                <input
                  type="number"
                  id="manpowerDuration"
                  name="manpowerDuration"
                  min={1}
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label
                  htmlFor="manpowerDurationUnit"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unidade
                </label>
                <select id="manpowerDurationUnit" name="manpowerDurationUnit">
                  <option value="dias">Dias</option>
                  <option value="meses">Meses</option>
                </select>
              </div>
            </div>
          </div>
          <div id="equipmentFields" className="hidden space-y-4">
            <div>
              <label
                htmlFor="equipmentSelect"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Selecione o Equipamento
              </label>
              <select id="equipmentSelect" name="equipmentSelect">
                <option value="">Selecione o equipamento</option>
                <option value="andaime">Andaime</option>
                <option value="betoneira">Betoneira</option>
                <option value="furadeira">Furadeira</option>
                <option value="britadeira">Britadeira</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div id="otherEquipmentDiv" className="hidden">
              <label
                htmlFor="otherEquipmentName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do Outro Equipamento
              </label>
              <input
                type="text"
                id="otherEquipmentName"
                name="otherEquipmentName"
                placeholder="Digite o nome do equipamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="equipmentDuration"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Duração
                </label>
                <input
                  type="number"
                  id="equipmentDuration"
                  name="equipmentDuration"
                  min={1}
                  placeholder="Ex: 30"
                />
              </div>
              <div>
                <label
                  htmlFor="equipmentDurationUnit"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unidade
                </label>
                <select id="equipmentDurationUnit" name="equipmentDurationUnit">
                  <option value="dias">Dias</option>
                  <option value="meses">Meses</option>
                </select>
              </div>
            </div>
          </div>
          <div id="otherServicesFields" className="hidden space-y-4">
            <div>
              <label
                htmlFor="otherDescription"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição
              </label>
              <input
                type="text"
                id="otherDescription"
                name="otherDescription"
                placeholder="Descreva o gasto"
              />
            </div>
          </div>
        </div>
        <div>
          <label
            htmlFor="expenseValue"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Valor Total (R$)
          </label>
          <input
            type="number"
            id="expenseValue"
            name="expenseValue"
            step="0.01"
            min={0}
            required=""
          />
        </div>
        <div>
          <label
            htmlFor="expensePaymentMethod"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Forma de Pagamento
          </label>
          <select
            id="expensePaymentMethod"
            name="expensePaymentMethod"
            required=""
          >
            <option value="">Selecione a forma de pagamento</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>
        <div className="pt-4">
          <button
            type="submit"
            id="submitExpenseBtn"
            className="btn-primary w-full py-3 text-lg font-semibold"
          >
            Registrar Gasto
          </button>
        </div>
      </form>
    </div>
  </div>
  <div
    id="budgetModal"
    className="modal fixed inset-0 z-50 flex items-center justify-center p-4 hidden"
  >
    <div className="modal-content w-full max-w-sm text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Definir Orçamento e Início
      </h2>
      <form id="budgetForm" className="space-y-4">
        <div>
          <label
            htmlFor="budgetValue"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Valor do Orçamento (R$)
          </label>
          <input
            type="number"
            id="budgetValue"
            name="budgetValue"
            step="0.01"
            min={0}
            placeholder="Ex: 50000.00"
            required=""
          />
        </div>
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Data de Início da Obra
          </label>
          <input type="date" id="startDate" name="startDate" />
        </div>
        <div className="pt-4">
          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg font-semibold"
          >
            Salvar Orçamento
          </button>
        </div>
      </form>
    </div>
  </div>
</>
