import { useMemo, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import "./SobrePage.css";

const contactInfo = {
  responsible: "Decleones Andrade",
  phone: "(66) 99684-6038",
  email: "decleones@andradecalhas.com.br",
  linkedinLabel: "linkedin.com/in/decleones-andrade",
  linkedinUrl: "https://www.linkedin.com/in/decleones-andrade",
};

const overviewCards = [
  {
    title: "Foco atual",
    text:
      "Monitoramento de lavouras com foco inicial na cultura do milho, reunindo coletas de campo, clima, mapa, alertas e relatórios em uma experiência simples.",
  },
  {
    title: "Propósito",
    text:
      "Ajudar o usuário a acompanhar a lavoura com mais organização, clareza visual e informações úteis para apoiar decisões no campo.",
  },
  {
    title: "Aplicação",
    text:
      "Uso acadêmico e aplicado ao agro, com base para evolução contínua e ampliação futura dos recursos do aplicativo.",
  },
];

const objectiveItems = [
  "Facilitar o cadastro e acompanhamento de propriedades e talhões.",
  "Registrar coletas de campo com mais organização e rastreabilidade.",
  "Apoiar a identificação de ocorrências observadas na lavoura.",
  "Reunir clima, mapa e contexto de campo em um único ambiente.",
  "Gerar relatórios e análises de forma mais rápida e organizada.",
  "Criar uma base digital para evoluir o acompanhamento agrícola com tecnologia aplicada.",
];

const benefitItems = [
  {
    title: "Informações centralizadas",
    text:
      "Reúne em um só lugar os dados mais importantes para acompanhar a lavoura.",
  },
  {
    title: "Apoio ao acompanhamento",
    text:
      "Facilita a leitura das ocorrências, da fase da cultura e das condições observadas em campo.",
  },
  {
    title: "Mais agilidade",
    text:
      "Ajuda na consulta rápida, no acompanhamento diário e na geração de relatórios.",
  },
  {
    title: "Mais organização",
    text:
      "Reduz anotações dispersas e melhora o controle sobre os registros da operação agrícola.",
  },
];

const featureBlocks = [
  {
    title: "Propriedades e talhões",
    text:
      "Organização das áreas acompanhadas para estruturar corretamente o monitoramento da lavoura.",
  },
  {
    title: "Coletas de campo",
    text:
      "Registro de observações, fase da cultura, imagens, localização e situação encontrada no campo.",
  },
  {
    title: "Alertas da lavoura",
    text:
      "Destaque para situações que exigem atenção, ajudando a priorizar ações no campo.",
  },
  {
    title: "Clima e contexto",
    text:
      "Consulta de informações climáticas associadas aos registros para ampliar a leitura da lavoura.",
  },
  {
    title: "Relatórios",
    text:
      "Organização das informações em análises e documentos para acompanhamento e apresentação.",
  },
  {
    title: "Biblioteca técnica",
    text:
      "Área com materiais, links e documentos de apoio para fortalecer a análise e os relatórios.",
  },
];

const stackItems = [
  {
    title: "Interface do app",
    text:
      "Aplicação web moderna, responsiva e pensada para uso em celular, com navegação simples e visual de app nativo.",
  },
  {
    title: "Serviços do sistema",
    text:
      "Estrutura responsável por guardar, consultar e organizar os dados de propriedades, talhões, coletas, alertas e relatórios.",
  },
  {
    title: "Integração de informações",
    text:
      "Conecta os módulos do app para que os dados registrados possam aparecer no painel, no mapa, nos alertas e nos relatórios.",
  },
  {
    title: "Base para evolução",
    text:
      "O projeto foi organizado para permitir melhorias futuras em mapas, clima, relatórios, imagens e análises da lavoura.",
  },
];

const projectInfoCards = [
  {
    title: "Projeto",
    text: "Projeto Integrador",
  },
  {
    title: "Curso",
    text: "Agrocomputação",
  },
  {
    title: "Instituição",
    text: "UniSenai - Rondonópolis/MT",
  },
  {
    title: "Colaboração",
    text: "Professora Natacha Brum",
  },
];

const teamMembers = [
  "Decleones Andrade de Souza",
  "Pietra Macagnam",
  "Sara Lima",
  "Sandra Peterson",
];

type SectionKey =
  | "about"
  | "purpose"
  | "objectives"
  | "features"
  | "benefits"
  | "stack"
  | "project"
  | "team"
  | "contact";

type AccordionSection = {
  key: SectionKey;
  kicker: string;
  title: string;
  description: string;
  content: ReactNode;
};

const initialOpenSections: Record<SectionKey, boolean> = {
  about: true,
  purpose: true,
  objectives: false,
  features: false,
  benefits: false,
  stack: false,
  project: false,
  team: false,
  contact: false,
};

const allSectionsOpen: Record<SectionKey, boolean> = {
  about: true,
  purpose: true,
  objectives: true,
  features: true,
  benefits: true,
  stack: true,
  project: true,
  team: true,
  contact: true,
};

const allSectionsClosed: Record<SectionKey, boolean> = {
  about: false,
  purpose: false,
  objectives: false,
  features: false,
  benefits: false,
  stack: false,
  project: false,
  team: false,
  contact: false,
};

export default function SobrePage() {
  const [openSections, setOpenSections] =
    useState<Record<SectionKey, boolean>>(initialOpenSections);

  function toggleSection(section: SectionKey): void {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function expandAllSections(): void {
    setOpenSections(allSectionsOpen);
  }

  function collapseAllSections(): void {
    setOpenSections(allSectionsClosed);
  }

  const expandedCount = useMemo(() => {
    return Object.values(openSections).filter(Boolean).length;
  }, [openSections]);

  const sections: AccordionSection[] = [
    {
      key: "about",
      kicker: "Sobre o EspIAgro",
      title: "O que é o aplicativo",
      description:
        "Entenda a proposta do EspIAgro e como ele apoia o acompanhamento da lavoura.",
      content: (
        <>
          <p className="espiagro-about-section-text">
            O <strong>EspIAgro</strong> é um aplicativo desenvolvido para apoiar
            o monitoramento de lavouras, com foco inicial na cultura do milho.
            Ele reúne registros de campo, localização, clima, alertas, mapa,
            biblioteca técnica e relatórios em um único ambiente.
          </p>

          <p className="espiagro-about-section-text">
            A proposta é tornar o acompanhamento agrícola mais organizado,
            visual e acessível, ajudando estudantes, técnicos, produtores e
            profissionais do agro a registrar informações importantes e consultar
            a situação da lavoura com mais clareza.
          </p>

          <p className="espiagro-about-section-text">
            O aplicativo transforma os dados coletados no campo em informações
            úteis para consulta, acompanhamento e apresentação, reduzindo
            anotações espalhadas e fortalecendo a visão sobre propriedades,
            talhões, fases da cultura, ocorrências e ações necessárias.
          </p>
        </>
      ),
    },
    {
      key: "purpose",
      kicker: "Essência do aplicativo",
      title: "Propósito, foco e aplicação",
      description:
        "Resumo da finalidade do EspIAgro e de como ele contribui para o acompanhamento agrícola.",
      content: (
        <div className="espiagro-about-grid-3">
          {overviewCards.map((item) => (
            <article key={item.title} className="espiagro-about-content-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      ),
    },
    {
      key: "objectives",
      kicker: "Objetivos",
      title: "O que o EspIAgro busca entregar",
      description:
        "Principais objetivos práticos definidos para o uso do aplicativo.",
      content: (
        <>
          <p className="espiagro-about-section-text">
            O EspIAgro foi pensado para apoiar o usuário em tarefas importantes
            do acompanhamento da lavoura:
          </p>

          <div className="espiagro-about-list">
            {objectiveItems.map((item) => (
              <div key={item} className="espiagro-about-list-item">
                {item}
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "features",
      kicker: "Funcionalidades",
      title: "Principais áreas do aplicativo",
      description:
        "Conheça os módulos que compõem a experiência atual do EspIAgro.",
      content: (
        <div className="espiagro-about-grid-2">
          {featureBlocks.map((item) => (
            <article key={item.title} className="espiagro-about-content-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      ),
    },
    {
      key: "benefits",
      kicker: "Benefícios",
      title: "Como o app ajuda no uso diário",
      description:
        "Principais ganhos para quem precisa acompanhar a lavoura com mais organização.",
      content: (
        <>
          <p className="espiagro-about-section-text">
            O EspIAgro contribui para reunir informações, melhorar a consulta
            aos registros e facilitar a visualização da situação da lavoura. Com
            isso, o usuário ganha mais clareza para acompanhar o campo e preparar
            relatórios com informações organizadas.
          </p>

          <div className="espiagro-about-grid-2">
            {benefitItems.map((item) => (
              <article key={item.title} className="espiagro-about-content-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "stack",
      kicker: "Construção do projeto",
      title: "Base de funcionamento do aplicativo",
      description:
        "Visão simples sobre a estrutura usada para construir e evoluir o EspIAgro.",
      content: (
        <>
          <p className="espiagro-about-section-text">
            O EspIAgro foi construído como uma solução digital aplicada ao agro,
            unindo organização de dados, mapas, clima, relatórios e uma
            interface pensada para uso real em celular.
          </p>

          <div className="espiagro-about-grid-2">
            {stackItems.map((item) => (
              <article key={item.title} className="espiagro-about-content-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </>
      ),
    },
    {
      key: "project",
      kicker: "Projeto acadêmico",
      title: "Dados do projeto",
      description:
        "Informações acadêmicas relacionadas ao desenvolvimento do EspIAgro.",
      content: (
        <>
          <div className="espiagro-about-grid-2">
            {projectInfoCards.map((item) => (
              <article key={item.title} className="espiagro-about-content-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="espiagro-about-note-card">
            <strong>Contexto</strong>
            <span>
              O EspIAgro faz parte do Projeto Integrador do curso de
              Agrocomputação, com foco em aplicar tecnologia para organizar,
              visualizar e acompanhar informações importantes da lavoura.
            </span>
          </div>
        </>
      ),
    },
    {
      key: "team",
      kicker: "Equipe",
      title: "Participantes do desenvolvimento",
      description:
        "Equipe responsável pela construção do projeto e colaboração acadêmica.",
      content: (
        <div className="espiagro-about-grid-2">
          <article className="espiagro-about-content-card">
            <h3>Desenvolvido por</h3>
            <div className="espiagro-about-list">
              {teamMembers.map((member) => (
                <div key={member} className="espiagro-about-list-item">
                  {member}
                </div>
              ))}
            </div>
          </article>

          <article className="espiagro-about-content-card">
            <h3>Colaboração acadêmica</h3>
            <p>
              Professora <strong>Natacha Brum</strong>, contribuindo no contexto
              do Projeto Integrador e no direcionamento acadêmico da proposta.
            </p>
          </article>
        </div>
      ),
    },
    {
      key: "contact",
      kicker: "Contato",
      title: "Informações de contato e continuidade",
      description:
        "Canais de contato vinculados ao desenvolvimento e à continuidade do projeto.",
      content: (
        <>
          <div className="espiagro-about-grid-2">
            <article className="espiagro-about-content-card">
              <h3>Responsável para contato</h3>
              <p>
                <strong>{contactInfo.responsible}</strong>
              </p>
            </article>

            <article className="espiagro-about-content-card">
              <h3>Telefone</h3>
              <p>{contactInfo.phone}</p>
            </article>

            <article className="espiagro-about-content-card">
              <h3>E-mail</h3>
              <p>
                <a href={`mailto:${contactInfo.email}`}>
                  {contactInfo.email}
                </a>
              </p>
            </article>

            <article className="espiagro-about-content-card">
              <h3>LinkedIn</h3>
              <p>
                <a
                  href={contactInfo.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {contactInfo.linkedinLabel}
                </a>
              </p>
            </article>
          </div>

          <div className="espiagro-about-note-card">
            <strong>Continuidade do projeto</strong>
            <span>
              O EspIAgro segue em evolução contínua, com melhorias visuais,
              funcionais e analíticas para se tornar cada vez mais útil,
              organizado e profissional no acompanhamento agrícola.
            </span>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="espiagro-about-page">
      <section className="espiagro-about-hero">
        <div className="espiagro-about-hero-main">
          <span className="espiagro-about-kicker">
            EspIAgro • Sobre o aplicativo
          </span>

          <h1 className="espiagro-about-title">
            Monitoramento da lavoura com organização, mapa, clima, alertas e
            relatórios em um só lugar.
          </h1>

          <p className="espiagro-about-description">
            O EspIAgro foi criado para apoiar o acompanhamento agrícola com uma
            experiência visual, prática e acessível no celular.
          </p>

          <div className="espiagro-about-band">
            Coletas de campo • Mapa • Clima • Alertas • Relatórios • Biblioteca
            técnica
          </div>

          <div className="espiagro-about-actions">
            <NavLink
              to="/"
              className="espiagro-about-action espiagro-about-action-primary"
            >
              Voltar ao painel
            </NavLink>

            <NavLink
              to="/base-tecnica"
              className="espiagro-about-action espiagro-about-action-secondary"
            >
              Abrir biblioteca técnica
            </NavLink>
          </div>
        </div>

        <div className="espiagro-about-hero-side">
          <div className="espiagro-about-stat-card">
            <span className="espiagro-about-stat-label">Escopo atual</span>
            <strong>Foco inicial na cultura do milho</strong>
          </div>

          <div className="espiagro-about-stat-card">
            <span className="espiagro-about-stat-label">Curso</span>
            <strong>Agrocomputação • UniSenai - Rondonópolis/MT</strong>
          </div>

          <div className="espiagro-about-stat-card">
            <span className="espiagro-about-stat-label">Projeto</span>
            <strong>Projeto Integrador</strong>
          </div>
        </div>
      </section>

      <section className="espiagro-about-toolbar">
        <div className="espiagro-about-toolbar-info">
          <span className="espiagro-about-toolbar-kicker">
            Navegação da página
          </span>
          <h2>Seções abertas: {expandedCount}/9</h2>
          <p>
            Abra apenas os tópicos que deseja consultar ou expanda tudo para ver
            a página completa.
          </p>
        </div>

        <div className="espiagro-about-toolbar-actions">
          <button
            type="button"
            className="espiagro-about-toolbar-button primary"
            onClick={expandAllSections}
          >
            Expandir tudo
          </button>

          <button
            type="button"
            className="espiagro-about-toolbar-button"
            onClick={collapseAllSections}
          >
            Recolher tudo
          </button>
        </div>
      </section>

      {sections.map((section) => {
        const isOpen = openSections[section.key];

        return (
          <details
            key={section.key}
            className="espiagro-about-accordion"
            open={isOpen}
          >
            <summary
              className="espiagro-about-accordion-summary"
              onClick={(event) => {
                event.preventDefault();
                toggleSection(section.key);
              }}
            >
              <div className="espiagro-about-accordion-title-wrap">
                <span className="espiagro-about-accordion-kicker">
                  {section.kicker}
                </span>

                <h2 className="espiagro-about-accordion-title">
                  {section.title}
                </h2>

                <p className="espiagro-about-accordion-description">
                  {section.description}
                </p>
              </div>

              <span className="espiagro-about-accordion-icon" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </summary>

            <div className="espiagro-about-accordion-body">
              <div className="espiagro-about-accordion-body-inner">
                {section.content}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}